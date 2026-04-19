import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the Stripe SDK so the constructor doesn't hit the network and we
// can assert the exact calls we expect for refund flows.
const mockStripeRefunds = { create: jest.fn() };
const mockStripeTransfers = {
  list: jest.fn(),
  createReversal: jest.fn(),
};
jest.mock('stripe', () => {
  const Ctor = jest.fn().mockImplementation(() => ({
    refunds: mockStripeRefunds,
    transfers: mockStripeTransfers,
  }));
  return { __esModule: true, default: Ctor };
});

describe('AdminService', () => {
  let service: AdminService;
  let paymentsService: PaymentsService;

  const mockPaymentsService = {
    reconcilePayments: jest.fn(),
  };

  const mockPrisma = {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_stub' : undefined,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reconcilePayments', () => {
    it('should call paymentsService.reconcilePayments', async () => {
      const mockResult = { reconciled: 10, errors: 0 };
      mockPaymentsService.reconcilePayments.mockResolvedValue(mockResult);

      const result = await service.reconcilePayments('admin_123');

      expect(result).toEqual(mockResult);
      expect(mockPaymentsService.reconcilePayments).toHaveBeenCalledWith(
        'admin_123',
        undefined,
      );
    });

    it('should pass options to paymentsService', async () => {
      const mockResult = { reconciled: 5, errors: 1 };
      mockPaymentsService.reconcilePayments.mockResolvedValue(mockResult);

      const options = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
      };

      const result = await service.reconcilePayments('admin_123', options);

      expect(result).toEqual(mockResult);
      expect(mockPaymentsService.reconcilePayments).toHaveBeenCalledWith(
        'admin_123',
        options,
      );
    });

    it('should handle errors from paymentsService', async () => {
      mockPaymentsService.reconcilePayments.mockRejectedValue(
        new Error('Reconciliation failed'),
      );

      await expect(service.reconcilePayments('admin_123')).rejects.toThrow(
        'Reconciliation failed',
      );
    });
  });

  describe('refundInvoice', () => {
    const paidInvoice = {
      id: 'inv_1',
      subtotalCents: 10000,
      totalCents: 11500,
      currency: 'CAD',
      status: 'PAID',
      stripePaymentIntentId: 'pi_abc',
      localMissionId: 'lm_1',
      missionId: null,
      metadata: null,
    };

    it('refunds the full invoice total by default', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(paidInvoice);
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_123',
        amount: 11500,
      });
      mockPrisma.invoice.update.mockResolvedValue({});

      const out = await service.refundInvoice(
        'inv_1',
        { reason: 'dispute resolution' },
        'admin_42',
      );

      expect(mockStripeRefunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_abc',
          amount: 11500,
          metadata: expect.objectContaining({
            invoiceId: 'inv_1',
            adminId: 'admin_42',
            adminReason: 'dispute resolution',
          }),
        }),
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv_1' },
          data: expect.objectContaining({ status: 'REFUNDED' }),
        }),
      );
      expect(out).toEqual({
        invoiceId: 'inv_1',
        stripeRefundId: 're_123',
        amountRefundedCents: 11500,
        currency: 'CAD',
        invoiceStatus: 'REFUNDED',
        workerTransferReversalId: undefined,
        partial: false,
      });
    });

    it('supports partial refunds', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(paidInvoice);
      mockStripeRefunds.create.mockResolvedValue({ id: 're_p', amount: 5000 });
      mockPrisma.invoice.update.mockResolvedValue({});

      const out = await service.refundInvoice(
        'inv_1',
        { reason: 'partial', amountCents: 5000 },
        'admin_42',
      );

      expect(out.partial).toBe(true);
      expect(out.amountRefundedCents).toBe(5000);
    });

    it('rejects invoices that are not PAID', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...paidInvoice,
        status: 'PENDING',
      });
      await expect(
        service.refundInvoice('inv_1', { reason: 'x' }, 'admin_42'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockStripeRefunds.create).not.toHaveBeenCalled();
    });

    it('rejects when invoice is missing', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.refundInvoice('inv_missing', { reason: 'x' }, 'admin_42'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when Stripe payment intent is missing', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...paidInvoice,
        stripePaymentIntentId: null,
      });
      await expect(
        service.refundInvoice('inv_1', { reason: 'x' }, 'admin_42'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects amountCents larger than invoice total', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(paidInvoice);
      await expect(
        service.refundInvoice(
          'inv_1',
          { reason: 'x', amountCents: 999999 },
          'admin_42',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockStripeRefunds.create).not.toHaveBeenCalled();
    });

    it('reverses the worker transfer when requested and one exists', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(paidInvoice);
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_r',
        amount: 11500,
      });
      mockStripeTransfers.list.mockResolvedValue({
        data: [{ id: 'tr_1', amount: 10000, amount_reversed: 0 }],
      });
      mockStripeTransfers.createReversal.mockResolvedValue({
        id: 'trr_1',
        amount: 10000,
      });
      mockPrisma.invoice.update.mockResolvedValue({});

      const out = await service.refundInvoice(
        'inv_1',
        { reason: 'fraud', reverseWorkerTransfer: true },
        'admin_42',
      );

      expect(mockStripeTransfers.list).toHaveBeenCalledWith(
        expect.objectContaining({ transfer_group: 'mission_lm_1' }),
      );
      expect(mockStripeTransfers.createReversal).toHaveBeenCalledWith(
        'tr_1',
        expect.objectContaining({ amount: 10000 }),
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
      expect(out.workerTransferReversalId).toBe('trr_1');
    });

    it('still resolves when reversal fails (refund already happened)', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(paidInvoice);
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_r2',
        amount: 11500,
      });
      mockStripeTransfers.list.mockRejectedValue(new Error('stripe down'));
      mockPrisma.invoice.update.mockResolvedValue({});

      const out = await service.refundInvoice(
        'inv_1',
        { reason: 'fraud', reverseWorkerTransfer: true },
        'admin_42',
      );

      expect(out.invoiceStatus).toBe('REFUNDED');
      expect(out.workerTransferReversalId).toBeUndefined();
    });
  });

  describe('refundInvoice without Stripe', () => {
    it('throws ServiceUnavailable when STRIPE_SECRET_KEY is missing', async () => {
      const module = await Test.createTestingModule({
        providers: [
          AdminService,
          { provide: PaymentsService, useValue: mockPaymentsService },
          { provide: PrismaService, useValue: mockPrisma },
          {
            provide: ConfigService,
            useValue: { get: () => undefined },
          },
        ],
      }).compile();
      const localService = module.get<AdminService>(AdminService);
      await expect(
        localService.refundInvoice('inv_1', { reason: 'x' }, 'admin'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});

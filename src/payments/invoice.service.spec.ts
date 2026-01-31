import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    localMission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    stripeEvent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(undefined); // No Stripe by default

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateInvoice', () => {
    it('should calculate invoice correctly', () => {
      // 10000 cents = $100
      const result = service.calculateInvoice(10000, 'Test Mission');

      expect(result).toEqual({
        subtotalCents: 10000,
        platformFeeCents: 1200, // 12%
        taxesCents: 0, // TAX_ENABLED is false
        totalCents: 11200,
        currency: 'CAD',
        description: 'Test Mission',
      });
    });

    it('should throw BadRequestException for price <= 0', () => {
      expect(() => service.calculateInvoice(0, 'Test')).toThrow(BadRequestException);
      expect(() => service.calculateInvoice(-100, 'Test')).toThrow(BadRequestException);
    });

    it('should round platform fee up', () => {
      // 1000 cents = $10, 12% = 120 cents
      const result = service.calculateInvoice(1000, 'Small mission');
      expect(result.platformFeeCents).toBe(120);

      // Edge case: 1 cent should round up
      const result2 = service.calculateInvoice(1, 'Tiny mission');
      expect(result2.platformFeeCents).toBe(1); // Math.ceil(0.12) = 1
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw BadRequestException when Stripe not configured', async () => {
      await expect(
        service.createCheckoutSession('mission-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvoice', () => {
    const mockInvoice = {
      id: 'inv-1',
      missionId: 'mission-1',
      localMissionId: 'local-mission-1',
      payerUserId: 'user-1',
      payerLocalUserId: 'user-1',
      subtotalCents: 10000,
      platformFeeCents: 1200,
      taxesCents: 0,
      totalCents: 11200,
      currency: 'CAD',
      status: 'PAID',
      description: 'Test Mission',
      paidAt: new Date('2026-01-30'),
      createdAt: new Date('2026-01-29'),
    };

    it('should return invoice details', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-1');

      expect(result).toEqual({
        id: 'inv-1',
        missionId: 'mission-1',
        subtotal: 100,
        platformFee: 12,
        taxes: 0,
        total: 112,
        currency: 'CAD',
        status: 'PAID',
        description: 'Test Mission',
        paidAt: mockInvoice.paidAt,
        createdAt: mockInvoice.createdAt,
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.getInvoice('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when requester is not the payer', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.getInvoice('inv-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow payer to view their invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-1', 'user-1');

      expect(result.id).toBe('inv-1');
    });
  });

  describe('handleCheckoutCompleted', () => {
    it('should skip if no invoiceId in metadata', async () => {
      const session = {
        id: 'cs_123',
        metadata: {},
      } as any;

      await service.handleCheckoutCompleted(session, 'evt_1');

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should skip already processed events', async () => {
      const session = {
        id: 'cs_123',
        metadata: { invoiceId: 'inv-1', localMissionId: 'lm-1' },
        payment_intent: 'pi_123',
      } as any;

      mockPrismaService.stripeEvent.findUnique.mockResolvedValue({
        id: 'evt_1',
        processed: true,
      });

      await service.handleCheckoutCompleted(session, 'evt_1');

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should update invoice and mission status on success', async () => {
      const session = {
        id: 'cs_123',
        metadata: { invoiceId: 'inv-1', localMissionId: 'lm-1' },
        payment_intent: 'pi_123',
      } as any;

      mockPrismaService.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrismaService.stripeEvent.upsert.mockResolvedValue({});
      mockPrismaService.invoice.update.mockResolvedValue({ id: 'inv-1' });
      mockPrismaService.localMission.update.mockResolvedValue({ id: 'lm-1' });

      await service.handleCheckoutCompleted(session, 'evt_new');

      expect(mockPrismaService.stripeEvent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt_new' },
          update: { processed: true, processedAt: expect.any(Date) },
          create: expect.objectContaining({
            id: 'evt_new',
            type: 'checkout.session.completed',
            processed: true,
          }),
        }),
      );

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
          stripePaymentIntentId: 'pi_123',
        },
      });

      expect(mockPrismaService.localMission.update).toHaveBeenCalledWith({
        where: { id: 'lm-1' },
        data: {
          status: 'paid',
          paidAt: expect.any(Date),
          stripePaymentIntentId: 'pi_123',
        },
      });
    });
  });

  describe('handleCheckoutExpired', () => {
    it('should skip if no invoiceId in metadata', async () => {
      const session = { id: 'cs_123', metadata: {} } as any;

      await service.handleCheckoutExpired(session, 'evt_1');

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should update invoice status to CANCELLED', async () => {
      const session = {
        id: 'cs_123',
        metadata: { invoiceId: 'inv-1' },
      } as any;

      mockPrismaService.stripeEvent.upsert.mockResolvedValue({});
      mockPrismaService.invoice.update.mockResolvedValue({ id: 'inv-1' });

      await service.handleCheckoutExpired(session, 'evt_expired');

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });
});

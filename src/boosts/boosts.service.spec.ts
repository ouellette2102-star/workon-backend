import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BoostsService } from './boosts.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoostStatus, BoostType } from '@prisma/client';

// Mock Stripe — return a controllable paymentIntents.create
const mockPiCreate = jest.fn();
jest.mock('stripe', () => {
  const Ctor = jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPiCreate },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      }),
    },
  }));
  return { __esModule: true, default: Ctor };
});

describe('BoostsService', () => {
  let service: BoostsService;
  let prisma: any;
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_BOOSTS_WEBHOOK_SECRET: 'whsec_test_fake',
    };
    mockPiCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_xyz',
    });

    const mockPrisma = {
      localUser: { findUnique: jest.fn() },
      localMission: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      boost: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(BoostsService);
    prisma = mockPrisma;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('createBoost', () => {
    it('creates a PaymentIntent for TOP_48H_14 with $14 amount', async () => {
      prisma.localMission.findUnique.mockResolvedValue({
        createdByUserId: 'u1',
      });
      prisma.localUser.findUnique.mockResolvedValue({ id: 'u1', email: 'u@x.io' });
      prisma.boost.create.mockResolvedValue({});

      const res = await service.createBoost('u1', BoostType.TOP_48H_14, 'm1');

      expect(res.amountCents).toBe(1400);
      expect(res.clientSecret).toBe('pi_test_123_secret_xyz');
      expect(mockPiCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1400, currency: 'cad' }),
      );
      expect(prisma.boost.create).toHaveBeenCalled();
    });

    it('creates URGENT_9 at $9', async () => {
      prisma.localMission.findUnique.mockResolvedValue({
        createdByUserId: 'u1',
      });
      prisma.localUser.findUnique.mockResolvedValue({ id: 'u1', email: 'u@x.io' });
      prisma.boost.create.mockResolvedValue({});

      const res = await service.createBoost('u1', BoostType.URGENT_9, 'm1');

      expect(res.amountCents).toBe(900);
      expect(mockPiCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 900 }),
      );
    });

    it('creates VERIFY_EXPRESS_19 without missionId at $19', async () => {
      prisma.localUser.findUnique.mockResolvedValue({ id: 'u1', email: 'u@x.io' });
      prisma.boost.create.mockResolvedValue({});

      const res = await service.createBoost('u1', BoostType.VERIFY_EXPRESS_19);

      expect(res.amountCents).toBe(1900);
      expect(prisma.localMission.findUnique).not.toHaveBeenCalled();
    });

    it('rejects mission-scoped boost without missionId', async () => {
      await expect(
        service.createBoost('u1', BoostType.TOP_48H_14),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when user is not the mission owner', async () => {
      prisma.localMission.findUnique.mockResolvedValue({
        createdByUserId: 'someone_else',
      });
      await expect(
        service.createBoost('u1', BoostType.TOP_48H_14, 'm1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when mission missing', async () => {
      prisma.localMission.findUnique.mockResolvedValue(null);
      await expect(
        service.createBoost('u1', BoostType.URGENT_9, 'bad'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyBoost', () => {
    it('TOP_48H_14 sets boostedUntil +48h', async () => {
      prisma.localMission.update.mockResolvedValue({});
      prisma.boost.update.mockResolvedValue({});

      await service.applyBoost({
        id: 'b1',
        type: BoostType.TOP_48H_14,
        missionId: 'm1',
      });

      expect(prisma.localMission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ boostedUntil: expect.any(Date) }),
        }),
      );
      expect(prisma.boost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BoostStatus.PAID }),
        }),
      );
    });

    it('URGENT_9 sets isUrgent=true and urgentUntil +24h', async () => {
      prisma.localMission.update.mockResolvedValue({});
      prisma.boost.update.mockResolvedValue({});

      await service.applyBoost({
        id: 'b2',
        type: BoostType.URGENT_9,
        missionId: 'm1',
      });

      expect(prisma.localMission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isUrgent: true,
            urgentUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('VERIFY_EXPRESS_19 only updates boost row (no mission side-effect)', async () => {
      prisma.boost.update.mockResolvedValue({});

      await service.applyBoost({
        id: 'b3',
        type: BoostType.VERIFY_EXPRESS_19,
        missionId: null,
      });

      expect(prisma.localMission.update).not.toHaveBeenCalled();
      expect(prisma.boost.update).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('is idempotent — skips already-PAID boost', async () => {
      prisma.boost.findUnique.mockResolvedValue({
        id: 'b1',
        type: BoostType.TOP_48H_14,
        missionId: 'm1',
        status: BoostStatus.PAID,
      });
      const res = await service.handleWebhook({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      } as any);
      expect(res.handled).toBe(true);
      expect(prisma.localMission.update).not.toHaveBeenCalled();
    });

    it('marks boost FAILED on payment_intent.payment_failed', async () => {
      prisma.boost.findUnique.mockResolvedValue({
        id: 'b1',
        type: BoostType.URGENT_9,
        missionId: 'm1',
        status: BoostStatus.PENDING,
      });
      prisma.boost.update.mockResolvedValue({});
      const res = await service.handleWebhook({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_123' } },
      } as any);
      expect(res.handled).toBe(true);
      expect(prisma.boost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: BoostStatus.FAILED },
        }),
      );
    });

    it('returns handled=false for unrelated events', async () => {
      const res = await service.handleWebhook({
        type: 'account.updated',
        data: { object: {} },
      } as any);
      expect(res.handled).toBe(false);
    });

    it('returns handled=false for PaymentIntent not in our boosts table', async () => {
      prisma.boost.findUnique.mockResolvedValue(null);
      const res = await service.handleWebhook({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_not_ours' } },
      } as any);
      expect(res.handled).toBe(false);
    });
  });
});

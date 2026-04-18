import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { CheckoutPlan } from './dto/checkout.dto';

// Mock Stripe — assert our own service logic, not Stripe. Match the
// `import Stripe from 'stripe'` ESM-default shape.
jest.mock('stripe', () => {
  const Ctor = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      update: jest.fn().mockResolvedValue({}),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        items: { data: [{ price: { id: 'price_client_pro' } }] },
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: {} },
      }),
    },
  }));
  return { __esModule: true, default: Ctor };
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: any;
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
      STRIPE_PRICE_CLIENT_PRO_MONTHLY: 'price_client_pro',
      STRIPE_PRICE_WORKER_PRO_MONTHLY: 'price_worker_pro',
      STRIPE_PRICE_CLIENT_BUSINESS_MONTHLY: 'price_client_biz',
      FRONTEND_URL: 'https://workonapp.vercel.app',
    };

    const mockPrisma = {
      subscription: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscriptionEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      localUser: {
        findUnique: jest.fn(),
      },
      localMission: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
    prisma = mockPrisma;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('getMySubscription', () => {
    it('returns FREE placeholder when no active sub', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      const res = await service.getMySubscription('u1');
      expect(res.plan).toBe(SubscriptionPlan.FREE);
      expect(res.status).toBeNull();
      expect(res.cancelAtPeriodEnd).toBe(false);
    });

    it('returns active sub details', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 's1',
        plan: SubscriptionPlan.CLIENT_PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date('2026-05-18'),
        canceledAt: null,
        stripeSubscriptionId: 'sub_x',
      });
      const res = await service.getMySubscription('u1');
      expect(res.plan).toBe(SubscriptionPlan.CLIENT_PRO);
      expect(res.cancelAtPeriodEnd).toBe(false);
    });

    it('sets cancelAtPeriodEnd when canceledAt present', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 's1',
        plan: SubscriptionPlan.WORKER_PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(),
        canceledAt: new Date(),
        stripeSubscriptionId: 'sub_x',
      });
      const res = await service.getMySubscription('u1');
      expect(res.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('hasActiveSubscription', () => {
    it('returns true for user with paid plan', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ id: 's' });
      expect(await service.hasActiveSubscription('u1')).toBe(true);
    });
    it('returns false for user without sub', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      expect(await service.hasActiveSubscription('u1')).toBe(false);
    });
  });

  describe('createCheckout', () => {
    it('creates a Stripe session and returns URL', async () => {
      prisma.localUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.local',
      });

      const res = await service.createCheckout(
        'u1',
        CheckoutPlan.CLIENT_PRO,
        {},
      );

      expect(res.url).toBe('https://checkout.stripe.com/test');
      expect(res.sessionId).toBe('cs_test_123');
    });

    it('throws if user not found', async () => {
      prisma.localUser.findUnique.mockResolvedValue(null);
      await expect(
        service.createCheckout('missing', CheckoutPlan.CLIENT_PRO, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if Stripe price ID not configured', async () => {
      delete process.env.STRIPE_PRICE_CLIENT_PRO_MONTHLY;
      prisma.localUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.local',
      });
      await expect(
        service.createCheckout('u1', CheckoutPlan.CLIENT_PRO, {}),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('cancelMine', () => {
    it('cancels at period end and sets canceledAt', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 's1',
        stripeSubscriptionId: 'sub_x',
      });
      prisma.subscription.update.mockResolvedValue({});

      const res = await service.cancelMine('u1');

      expect(res.canceledAt).toBeInstanceOf(Date);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { canceledAt: expect.any(Date) },
      });
    });

    it('throws 404 if no active subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      await expect(service.cancelMine('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    it('ignores unrelated events', async () => {
      const res = await service.handleWebhook({
        id: 'e1',
        type: 'product.created',
        data: { object: {} },
      } as any);
      expect(res.handled).toBe(false);
    });

    it('persists checkout.session.completed and creates new Subscription row', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue({ id: 's_new' });

      const res = await service.handleWebhook({
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            client_reference_id: 'u1',
            subscription: 'sub_stripe_123',
            customer: 'cus_1',
            metadata: { userId: 'u1', plan: 'CLIENT_PRO' },
          },
        },
      } as any);

      expect(res.handled).toBe(true);
      expect(prisma.subscription.create).toHaveBeenCalled();
      const args = prisma.subscription.create.mock.calls[0][0];
      expect(args.data.userId).toBe('u1');
      expect(args.data.plan).toBe(SubscriptionPlan.CLIENT_PRO);
      expect(args.data.stripeCustomerId).toBe('cus_1');
      expect(prisma.subscriptionEvent.create).toHaveBeenCalled();
    });

    it('is idempotent — skips duplicate event via P2002', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1',
        stripeSubscriptionId: 'sub_x',
      });
      prisma.subscription.update.mockResolvedValue({ id: 's1' });
      prisma.subscriptionEvent.create.mockRejectedValue(
        Object.assign(new Error('duplicate'), { code: 'P2002' }),
      );

      const res = await service.handleWebhook({
        id: 'evt_dup',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_x',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 3600,
            cancel_at_period_end: false,
            items: { data: [{ price: { id: 'price_client_pro' } }] },
          },
        },
      } as any);

      expect(res.handled).toBe(true);
    });

    it('marks PAST_DUE on invoice.payment_failed', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1',
        stripeSubscriptionId: 'sub_x',
      });
      prisma.subscription.update.mockResolvedValue({ id: 's1' });

      await service.handleWebhook({
        id: 'evt_failed',
        type: 'invoice.payment_failed',
        data: { object: { subscription: 'sub_x' } },
      } as any);

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.PAST_DUE,
          }),
        }),
      );
    });
  });

  describe('missionsThisMonth', () => {
    it('counts missions created since start of current month', async () => {
      prisma.localMission.count.mockResolvedValue(2);
      const n = await service.missionsThisMonth('u1');
      expect(n).toBe(2);
      const call = prisma.localMission.count.mock.calls[0][0];
      expect(call.where.createdByUserId).toBe('u1');
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
      expect(call.where.createdAt.gte.getDate()).toBe(1);
    });
  });

  describe('Stripe not configured', () => {
    it('createCheckout throws clear error when STRIPE_SECRET_KEY missing', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      // Re-instantiate service with env cleared
      const mockPrisma = { localUser: { findUnique: jest.fn() }, subscription: {} };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionsService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      const svc = module.get(SubscriptionsService);

      await expect(
        svc.createCheckout('u1', CheckoutPlan.CLIENT_PRO, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

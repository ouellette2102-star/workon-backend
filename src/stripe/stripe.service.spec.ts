import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, UserRole } from '@prisma/client';

// Mock Stripe with proper ES module default export structure
const mockStripeInstance = {
  paymentIntents: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// Mock the default export properly
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockStripeInstance),
  };
});

// Now import the service after mock setup
import { StripeService } from './stripe.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  mission: {
    findUnique: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockNotificationsService = {
  createForMissionStatusChange: jest.fn(),
};

describe('StripeService', () => {
  let service: StripeService;

  // Save original env
  const originalEnv = process.env;

  beforeAll(() => {
    // Set env vars before module compilation
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_secret';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with Stripe key', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createPaymentIntent', () => {
    const mockUser = {
      id: 'user-1',
      userProfile: { role: UserRole.EMPLOYER },
    };

    const mockMission = {
      id: 'mission-1',
      title: 'Test Mission',
      authorClientId: 'user-1',
      status: 'COMPLETED',
      assigneeWorkerId: 'worker-1',
      assigneeWorker: { id: 'worker-1', clerkId: 'clerk-worker' },
    };

    it('should create a payment intent for employer', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
        missionId: 'mission-1',
      });

      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });

      const result = await service.createPaymentIntent('user-1', 'mission-1', 100);

      expect(result.clientSecret).toBe('pi_test_123_secret');
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
    });

    it('should allow RESIDENTIAL role to create payment', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: { role: UserRole.RESIDENTIAL },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.create.mockResolvedValue({ id: 'pay-1' });

      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });

      const result = await service.createPaymentIntent('user-1', 'mission-1', 100);

      expect(result.clientSecret).toBeDefined();
    });

    it('should reject if user profile not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if user has no userProfile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: null,
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if user is not EMPLOYER or RESIDENTIAL', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: { role: UserRole.WORKER },
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject ADMIN role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: { role: UserRole.ADMIN },
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if mission not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if user is not mission owner', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        authorClientId: 'other-user',
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if mission is not completed', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'OPEN',
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if mission is IN_PROGRESS', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if no worker assigned', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        assigneeWorkerId: null,
      });

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate correct amount in cents', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.create.mockResolvedValue({ id: 'pay-1' });

      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });

      await service.createPaymentIntent('user-1', 'mission-1', 99.99);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9999, // 99.99 * 100
          currency: 'cad',
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: { missionId: 'mission-1' },
          },
        },
      };

      const mockPayment = {
        id: 'pay-1',
        missionId: 'mission-1',
        mission: {
          id: 'mission-1',
          assigneeWorker: { id: 'worker-1', clerkId: 'clerk-worker' },
          authorClient: { id: 'employer-1', clerkId: 'clerk-employer' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });

      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('payment_intent.succeeded');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentStatus.SUCCEEDED },
        }),
      );
    });

    it('should notify worker on payment success', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test_123' },
        },
      };

      const mockPayment = {
        id: 'pay-1',
        missionId: 'mission-1',
        mission: {
          id: 'mission-1',
          assigneeWorker: { id: 'worker-1', clerkId: 'clerk-worker' },
          authorClient: { id: 'employer-1', clerkId: 'clerk-employer' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('test'), 'sig_test');

      expect(mockNotificationsService.createForMissionStatusChange).toHaveBeenCalledTimes(2);
    });

    it('should process payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            last_payment_error: { message: 'Card declined' },
          },
        },
      };

      const mockPayment = {
        id: 'pay-1',
        missionId: 'mission-1',
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.DISPUTED,
      });

      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('payment_intent.payment_failed');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentStatus.DISPUTED },
        }),
      );
    });

    it('should handle payment failed with no error message', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            last_payment_error: null,
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        missionId: 'mission-1',
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('payment_intent.payment_failed');
    });

    it('should handle unknown event types gracefully', async () => {
      const mockEvent = {
        type: 'account.updated',
        data: { object: {} },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('account.updated');
    });

    it('should throw on invalid webhook signature', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('test'), 'bad_sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing payment gracefully on succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_unknown' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Should not throw, just log warning
      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('payment_intent.succeeded');
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should handle missing payment on failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: { id: 'pi_unknown' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      const result = await service.handleWebhook(
        Buffer.from('test'),
        'sig_test',
      );

      expect(result.type).toBe('payment_intent.payment_failed');
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should handle payment success without assigneeWorker', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test_123' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        missionId: 'mission-1',
        mission: {
          id: 'mission-1',
          assigneeWorker: null,
          authorClient: { id: 'employer-1', clerkId: 'clerk-employer' },
        },
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('test'), 'sig_test');

      // Only employer notification
      expect(mockNotificationsService.createForMissionStatusChange).toHaveBeenCalledTimes(1);
    });

    it('should handle payment success without authorClient', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test_123' },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        missionId: 'mission-1',
        mission: {
          id: 'mission-1',
          assigneeWorker: { id: 'worker-1', clerkId: 'clerk-worker' },
          authorClient: null,
        },
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('test'), 'sig_test');

      // Only worker notification
      expect(mockNotificationsService.createForMissionStatusChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWorkerPayments', () => {
    it('should return payment history for worker', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'worker-1',
        userProfile: { role: UserRole.WORKER },
      });

      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          missionId: 'mission-1',
          amount: 100,
          platformFeePct: 12,
          currency: 'CAD',
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date(),
          mission: {
            id: 'mission-1',
            title: 'Test Mission',
            categoryId: 'cat-1',
          },
        },
      ]);

      const result = await service.getWorkerPayments('worker-1');

      expect(result).toHaveLength(1);
      expect(result[0].netAmount).toBe(88); // 100 * (1 - 12/100)
      expect(result[0].missionTitle).toBe('Test Mission');
    });

    it('should return empty array if no payments', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'worker-1',
        userProfile: { role: UserRole.WORKER },
      });

      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getWorkerPayments('worker-1');

      expect(result).toHaveLength(0);
    });

    it('should reject if user is not a worker', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: { role: UserRole.EMPLOYER },
      });

      await expect(service.getWorkerPayments('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getWorkerPayments('unknown')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if user has no profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        userProfile: null,
      });

      await expect(service.getWorkerPayments('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createConnectOnboardingLink', () => {
    it('should throw not implemented error', async () => {
      await expect(
        service.createConnectOnboardingLink('user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include helpful message', async () => {
      try {
        await service.createConnectOnboardingLink('user-1');
      } catch (e) {
        expect((e as BadRequestException).message).toContain('pas encore disponible');
      }
    });
  });

  describe('checkOnboardingStatus', () => {
    it('should return not onboarded status', async () => {
      const result = await service.checkOnboardingStatus('user-1');

      expect(result.onboarded).toBe(false);
      expect(result.chargesEnabled).toBe(false);
      expect(result.payoutsEnabled).toBe(false);
      expect(result.requirementsNeeded).toContain('stripe_connect_not_implemented');
    });
  });
});

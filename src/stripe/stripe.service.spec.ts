import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, PaymentStatus } from '@prisma/client';

// Store original env
const originalEnv = process.env;

describe('StripeService', () => {
  let service: StripeService;

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

  const mockUser = {
    id: 'user-1',
    clerkId: 'clerk-1',
    userProfile: {
      role: UserRole.EMPLOYER,
    },
  };

  const mockWorkerUser = {
    id: 'worker-1',
    clerkId: 'clerk-worker-1',
    userProfile: {
      role: UserRole.WORKER,
    },
  };

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    authorClientId: 'user-1',
    assigneeWorkerId: 'worker-1',
    status: 'COMPLETED',
    assigneeWorker: {
      id: 'worker-1',
      clerkId: 'clerk-worker-1',
    },
  };

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'development' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize without Stripe key in development', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createPaymentIntent', () => {
    it('should throw BadRequestException when Stripe not configured', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.createPaymentIntent('user-1', 'mission-1', 100),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkerPayments', () => {
    it('should return payments for worker', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockWorkerUser);
      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          id: 'payment-1',
          missionId: 'mission-1',
          amount: 100,
          platformFeePct: 12,
          currency: 'CAD',
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date(),
          mission: {
            id: 'mission-1',
            title: 'Test Mission',
            categoryId: 'cleaning',
          },
        },
      ]);

      const result = await service.getWorkerPayments('worker-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('payment-1');
      expect(result[0].netAmount).toBe(88); // 100 * (1 - 0.12)
    });

    it('should throw ForbiddenException for non-worker', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.getWorkerPayments('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getWorkerPayments('unknown')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createConnectOnboardingLink', () => {
    it('should throw BadRequestException (not implemented)', async () => {
      await expect(service.createConnectOnboardingLink('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkOnboardingStatus', () => {
    it('should return not onboarded status (stub)', async () => {
      const result = await service.checkOnboardingStatus('user-1');

      expect(result.onboarded).toBe(false);
      expect(result.chargesEnabled).toBe(false);
      expect(result.payoutsEnabled).toBe(false);
      expect(result.requirementsNeeded).toContain('stripe_connect_not_implemented');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationWorkerService } from './notification-worker.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationQueueStatus,
} from '@prisma/client';

describe('NotificationWorkerService', () => {
  let service: NotificationWorkerService;
  let prismaService: PrismaService;
  let deliveryService: NotificationDeliveryService;

  const mockPrismaService = {
    notificationQueue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockQueueService = {
    getPendingNotifications: jest.fn(),
    markAsProcessing: jest.fn(),
    markAsDelivered: jest.fn(),
    markAsFailed: jest.fn(),
  };

  const mockDeliveryService = {
    deliverNotification: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NOTIFICATION_WORKER_ENABLED: '1',
        NOTIFICATION_WORKER_BATCH_SIZE: '5',
        NOTIFICATION_WORKER_POLL_INTERVAL_MS: '100',
        NOTIFICATION_WORKER_MAX_ITERATIONS: '3',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockNotification = {
    id: 'queue_123',
    userId: 'user_123',
    notificationType: NotificationType.MESSAGE_NEW,
    title: 'Test',
    body: 'Test body',
    data: null,
    channels: ['push', 'in_app'],
    scheduledFor: new Date(),
    priority: NotificationPriority.NORMAL,
    status: NotificationQueueStatus.PENDING,
    attempts: 0,
    maxAttempts: 3,
    lastAttemptAt: null,
    deliveredAt: null,
    failedAt: null,
    errorMessage: null,
    correlationId: null,
    idempotencyKey: null,
    deliveryResults: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationWorkerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationQueueService,
          useValue: mockQueueService,
        },
        {
          provide: NotificationDeliveryService,
          useValue: mockDeliveryService,
        },
      ],
    }).compile();

    service = module.get<NotificationWorkerService>(NotificationWorkerService);
    prismaService = module.get<PrismaService>(PrismaService);
    deliveryService = module.get<NotificationDeliveryService>(NotificationDeliveryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return worker status and config', () => {
      const status = service.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.processedCount).toBe(0);
      expect(status.failedCount).toBe(0);
      expect(status.config.batchSize).toBe(5);
      expect(status.config.pollingIntervalMs).toBe(100);
      expect(status.config.maxIterations).toBe(3);
      expect(status.config.enabled).toBe(true);
    });
  });

  describe('processBatch', () => {
    it('should process pending notifications', async () => {
      // Mock fetch
      mockPrismaService.notificationQueue.findMany
        .mockResolvedValueOnce([mockNotification]) // First call: get pending
        .mockResolvedValueOnce([{ ...mockNotification, status: NotificationQueueStatus.PROCESSING }]); // Second call: re-fetch

      mockPrismaService.notificationQueue.updateMany.mockResolvedValue({ count: 1 });

      // Mock delivery
      mockDeliveryService.deliverNotification.mockResolvedValue({
        overallSuccess: true,
        channelResults: { push: { success: true } },
      });

      mockPrismaService.notificationQueue.update.mockResolvedValue({});

      const processed = await service.processBatch();

      expect(processed).toBe(1);
      expect(mockDeliveryService.deliverNotification).toHaveBeenCalled();
    });

    it('should return 0 when no pending notifications', async () => {
      mockPrismaService.notificationQueue.findMany.mockResolvedValue([]);

      const processed = await service.processBatch();

      expect(processed).toBe(0);
      expect(mockDeliveryService.deliverNotification).not.toHaveBeenCalled();
    });

    it('should handle delivery failure and schedule retry', async () => {
      const notificationWithAttempt = {
        ...mockNotification,
        attempts: 1,
        status: NotificationQueueStatus.PROCESSING,
      };

      mockPrismaService.notificationQueue.findMany
        .mockResolvedValueOnce([mockNotification])
        .mockResolvedValueOnce([notificationWithAttempt]);

      mockPrismaService.notificationQueue.updateMany.mockResolvedValue({ count: 1 });

      mockDeliveryService.deliverNotification.mockResolvedValue({
        overallSuccess: false,
        channelResults: { push: { success: false, errorMessage: 'Failed' } },
      });

      mockPrismaService.notificationQueue.update.mockResolvedValue({});

      await service.processBatch();

      // Should schedule retry (not mark as failed since attempts < maxAttempts)
      expect(mockPrismaService.notificationQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: NotificationQueueStatus.PENDING,
          }),
        }),
      );
    });

    it('should mark as failed after max attempts', async () => {
      const notificationAtMaxAttempts = {
        ...mockNotification,
        attempts: 2, // Will be 3 after increment (= maxAttempts)
        maxAttempts: 3,
        status: NotificationQueueStatus.PROCESSING,
      };

      mockPrismaService.notificationQueue.findMany
        .mockResolvedValueOnce([mockNotification])
        .mockResolvedValueOnce([notificationAtMaxAttempts]);

      mockPrismaService.notificationQueue.updateMany.mockResolvedValue({ count: 1 });

      mockDeliveryService.deliverNotification.mockResolvedValue({
        overallSuccess: false,
        channelResults: {},
      });

      mockPrismaService.notificationQueue.update.mockResolvedValue({});

      await service.processBatch();

      // Should mark as FAILED
      expect(mockPrismaService.notificationQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: NotificationQueueStatus.FAILED,
          }),
        }),
      );
    });
  });

  describe('processOne', () => {
    it('should process a single notification by ID', async () => {
      mockPrismaService.notificationQueue.findUnique
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce({ ...mockNotification, status: NotificationQueueStatus.PROCESSING, attempts: 1 });

      mockPrismaService.notificationQueue.update.mockResolvedValue({});

      mockDeliveryService.deliverNotification.mockResolvedValue({
        overallSuccess: true,
        channelResults: {},
      });

      const result = await service.processOne('queue_123');

      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue(null);

      const result = await service.processOne('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if notification is not pending', async () => {
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue({
        ...mockNotification,
        status: NotificationQueueStatus.DELIVERED,
      });

      const result = await service.processOne('queue_123');

      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    it('should set shouldStop flag', () => {
      service.stop();
      // The flag is private, but we can check that getStatus still works
      expect(service.getStatus().isRunning).toBe(false);
    });
  });

  describe('start (disabled)', () => {
    it('should not start when disabled', async () => {
      // Create new instance with disabled config
      const disabledConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NOTIFICATION_WORKER_ENABLED') return '0';
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationWorkerService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfig },
          { provide: NotificationQueueService, useValue: mockQueueService },
          { provide: NotificationDeliveryService, useValue: mockDeliveryService },
        ],
      }).compile();

      const disabledService = module.get<NotificationWorkerService>(NotificationWorkerService);

      await disabledService.start();

      // Should return immediately without processing
      expect(disabledService.getStatus().config.enabled).toBe(false);
    });
  });
});


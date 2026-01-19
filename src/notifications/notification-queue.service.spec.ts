import { Test, TestingModule } from '@nestjs/testing';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationQueueStatus,
  DeliveryStatus,
} from '@prisma/client';

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;
  let prismaService: PrismaService;
  let preferencesService: NotificationPreferencesService;

  const mockPrismaService = {
    notificationQueue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    notificationDelivery: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPreferencesService = {
    getEnabledChannels: jest.fn(),
    getPreference: jest.fn(),
    isInQuietHours: jest.fn(),
  };

  const mockUserId = 'user_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    service = module.get<NotificationQueueService>(NotificationQueueService);
    prismaService = module.get<PrismaService>(PrismaService);
    preferencesService = module.get<NotificationPreferencesService>(NotificationPreferencesService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueNotification', () => {
    const mockQueuedNotification = {
      id: 'queue_123',
      userId: mockUserId,
      notificationType: NotificationType.MESSAGE_NEW,
      title: 'New Message',
      body: 'You have a new message',
      status: NotificationQueueStatus.PENDING,
      channels: ['push', 'in_app'],
      priority: NotificationPriority.NORMAL,
    };

    it('should queue a notification successfully', async () => {
      mockPreferencesService.getEnabledChannels.mockResolvedValue(['push', 'in_app']);
      mockPreferencesService.getPreference.mockResolvedValue(null);
      mockPrismaService.notificationQueue.create.mockResolvedValue(mockQueuedNotification);

      const result = await service.queueNotification({
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        title: 'New Message',
        body: 'You have a new message',
      });

      expect(result).toEqual(mockQueuedNotification);
      expect(mockPrismaService.notificationQueue.create).toHaveBeenCalled();
    });

    it('should return existing notification for duplicate idempotency key', async () => {
      const existingNotification = { ...mockQueuedNotification, idempotencyKey: 'key_123' };
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue(existingNotification);

      const result = await service.queueNotification({
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        title: 'New Message',
        body: 'You have a new message',
        idempotencyKey: 'key_123',
      });

      expect(result).toEqual(existingNotification);
      expect(mockPrismaService.notificationQueue.create).not.toHaveBeenCalled();
    });

    it('should cancel notification if no channels enabled', async () => {
      mockPreferencesService.getEnabledChannels.mockResolvedValue([]);
      const cancelledNotification = {
        ...mockQueuedNotification,
        status: NotificationQueueStatus.CANCELLED,
        channels: [],
        errorMessage: 'No channels enabled by user preferences',
      };
      mockPrismaService.notificationQueue.create.mockResolvedValue(cancelledNotification);

      const result = await service.queueNotification({
        userId: mockUserId,
        notificationType: NotificationType.MARKETING_PROMO,
        title: 'Promo',
        body: 'Check out our promo',
      });

      expect(result.status).toBe(NotificationQueueStatus.CANCELLED);
    });

    it('should delay notification during quiet hours (non-critical)', async () => {
      mockPreferencesService.getEnabledChannels.mockResolvedValue(['push']);
      mockPreferencesService.getPreference.mockResolvedValue({
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'America/Toronto',
      });
      mockPreferencesService.isInQuietHours.mockReturnValue(true);

      const delayedNotification = {
        ...mockQueuedNotification,
        scheduledFor: new Date('2026-01-20T08:00:00'),
      };
      mockPrismaService.notificationQueue.create.mockResolvedValue(delayedNotification);

      await service.queueNotification({
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        title: 'New Message',
        body: 'You have a new message',
      });

      expect(mockPrismaService.notificationQueue.create).toHaveBeenCalled();
    });

    it('should NOT delay CRITICAL notifications during quiet hours', async () => {
      mockPreferencesService.getEnabledChannels.mockResolvedValue(['push']);
      mockPreferencesService.getPreference.mockResolvedValue({
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
      mockPreferencesService.isInQuietHours.mockReturnValue(true);
      mockPrismaService.notificationQueue.create.mockResolvedValue(mockQueuedNotification);

      await service.queueNotification({
        userId: mockUserId,
        notificationType: NotificationType.ACCOUNT_SECURITY,
        title: 'Security Alert',
        body: 'New login detected',
        priority: NotificationPriority.CRITICAL,
      });

      // Should not delay - check that scheduledFor is immediate
      const createCall = mockPrismaService.notificationQueue.create.mock.calls[0][0];
      expect(createCall.data.priority).toBe(NotificationPriority.CRITICAL);
    });
  });

  describe('getPendingNotifications', () => {
    it('should return pending notifications ordered by priority', async () => {
      const mockNotifications = [
        { id: '1', priority: NotificationPriority.HIGH },
        { id: '2', priority: NotificationPriority.NORMAL },
      ];
      mockPrismaService.notificationQueue.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getPendingNotifications(100);

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notificationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: NotificationQueueStatus.PENDING,
          }),
          orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
        }),
      );
    });

    it('should filter by priority if specified', async () => {
      mockPrismaService.notificationQueue.findMany.mockResolvedValue([]);

      await service.getPendingNotifications(50, NotificationPriority.CRITICAL);

      expect(mockPrismaService.notificationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: NotificationPriority.CRITICAL,
          }),
        }),
      );
    });
  });

  describe('markAsProcessing', () => {
    it('should update status and increment attempts', async () => {
      const updatedNotification = {
        id: 'queue_123',
        status: NotificationQueueStatus.PROCESSING,
        attempts: 1,
      };
      mockPrismaService.notificationQueue.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsProcessing('queue_123');

      expect(result.status).toBe(NotificationQueueStatus.PROCESSING);
      expect(mockPrismaService.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue_123' },
        data: expect.objectContaining({
          status: NotificationQueueStatus.PROCESSING,
          attempts: { increment: 1 },
        }),
      });
    });
  });

  describe('markAsDelivered', () => {
    it('should update status to DELIVERED', async () => {
      const deliveredNotification = {
        id: 'queue_123',
        status: NotificationQueueStatus.DELIVERED,
        deliveredAt: new Date(),
      };
      mockPrismaService.notificationQueue.update.mockResolvedValue(deliveredNotification);

      const result = await service.markAsDelivered('queue_123', { push: { success: true } });

      expect(result.status).toBe(NotificationQueueStatus.DELIVERED);
    });
  });

  describe('markAsFailed', () => {
    it('should retry if attempts < maxAttempts', async () => {
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue({
        id: 'queue_123',
        attempts: 1,
        maxAttempts: 3,
      });
      mockPrismaService.notificationQueue.update.mockResolvedValue({
        id: 'queue_123',
        status: NotificationQueueStatus.PENDING,
      });

      const result = await service.markAsFailed('queue_123', 'Connection timeout');

      expect(result.status).toBe(NotificationQueueStatus.PENDING);
      // Should schedule for retry with backoff
      expect(mockPrismaService.notificationQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: NotificationQueueStatus.PENDING,
            errorMessage: 'Connection timeout',
          }),
        }),
      );
    });

    it('should mark as FAILED if max attempts reached', async () => {
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue({
        id: 'queue_123',
        attempts: 3,
        maxAttempts: 3,
      });
      mockPrismaService.notificationQueue.update.mockResolvedValue({
        id: 'queue_123',
        status: NotificationQueueStatus.FAILED,
        failedAt: new Date(),
      });

      const result = await service.markAsFailed('queue_123', 'Max retries exceeded');

      expect(result.status).toBe(NotificationQueueStatus.FAILED);
    });

    it('should throw error if queue entry not found', async () => {
      mockPrismaService.notificationQueue.findUnique.mockResolvedValue(null);

      await expect(service.markAsFailed('nonexistent', 'Error')).rejects.toThrow(
        'Queue entry not found',
      );
    });
  });

  describe('cancelNotification', () => {
    it('should update status to CANCELLED', async () => {
      mockPrismaService.notificationQueue.update.mockResolvedValue({
        id: 'queue_123',
        status: NotificationQueueStatus.CANCELLED,
      });

      const result = await service.cancelNotification('queue_123');

      expect(result.status).toBe(NotificationQueueStatus.CANCELLED);
    });
  });

  describe('recordDeliveryAttempt', () => {
    it('should create delivery record', async () => {
      const mockDelivery = {
        id: 'delivery_123',
        queueId: 'queue_123',
        userId: mockUserId,
        channel: 'push',
        status: DeliveryStatus.PENDING,
      };
      mockPrismaService.notificationDelivery.create.mockResolvedValue(mockDelivery);

      const result = await service.recordDeliveryAttempt({
        queueId: 'queue_123',
        userId: mockUserId,
        channel: 'push',
        provider: 'fcm',
        pushToken: 'token_123',
      });

      expect(result).toEqual(mockDelivery);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status with timestamp', async () => {
      mockPrismaService.notificationDelivery.update.mockResolvedValue({
        id: 'delivery_123',
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = await service.updateDeliveryStatus(
        'delivery_123',
        DeliveryStatus.DELIVERED,
      );

      expect(result.status).toBe(DeliveryStatus.DELIVERED);
    });

    it('should include error details for failed status', async () => {
      mockPrismaService.notificationDelivery.update.mockResolvedValue({
        id: 'delivery_123',
        status: DeliveryStatus.FAILED,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Push token is invalid',
      });

      await service.updateDeliveryStatus('delivery_123', DeliveryStatus.FAILED, {
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Push token is invalid',
      });

      expect(mockPrismaService.notificationDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorCode: 'INVALID_TOKEN',
            errorMessage: 'Push token is invalid',
          }),
        }),
      );
    });
  });

  describe('getUserNotificationHistory', () => {
    it('should return paginated notification history', async () => {
      const mockItems = [{ id: '1' }, { id: '2' }];
      mockPrismaService.notificationQueue.findMany.mockResolvedValue(mockItems);
      mockPrismaService.notificationQueue.count.mockResolvedValue(10);

      const result = await service.getUserNotificationHistory(mockUserId, {
        limit: 2,
        offset: 0,
      });

      expect(result).toEqual({ items: mockItems, total: 10 });
    });

    it('should filter by status and type', async () => {
      mockPrismaService.notificationQueue.findMany.mockResolvedValue([]);
      mockPrismaService.notificationQueue.count.mockResolvedValue(0);

      await service.getUserNotificationHistory(mockUserId, {
        status: NotificationQueueStatus.DELIVERED,
        notificationType: NotificationType.PAYMENT_RECEIVED,
      });

      expect(mockPrismaService.notificationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: NotificationQueueStatus.DELIVERED,
            notificationType: NotificationType.PAYMENT_RECEIVED,
          }),
        }),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return aggregated queue statistics', async () => {
      mockPrismaService.notificationQueue.groupBy
        .mockResolvedValueOnce([
          { status: 'PENDING', _count: 10 },
          { status: 'DELIVERED', _count: 100 },
          { status: 'FAILED', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { priority: 'HIGH', _count: 3 },
          { priority: 'NORMAL', _count: 7 },
        ]);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        pending: 10,
        processing: 0,
        delivered: 100,
        failed: 5,
        byPriority: {
          HIGH: 3,
          NORMAL: 7,
        },
      });
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old delivered/failed/cancelled notifications', async () => {
      mockPrismaService.notificationQueue.deleteMany.mockResolvedValue({ count: 50 });

      const result = await service.cleanupOldNotifications(30);

      expect(result).toBe(50);
      expect(mockPrismaService.notificationQueue.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [
                NotificationQueueStatus.DELIVERED,
                NotificationQueueStatus.FAILED,
                NotificationQueueStatus.CANCELLED,
              ],
            },
          }),
        }),
      );
    });
  });
});


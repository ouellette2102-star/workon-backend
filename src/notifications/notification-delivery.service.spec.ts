import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { FeatureFlagsService } from '../config/feature-flags.service';
import {
  DELIVERY_PROVIDERS,
  EmailProvider,
  PushProvider,
  DeliveryResult,
} from './providers';
import {
  NotificationType,
  NotificationPriority,
  NotificationQueueStatus,
} from '@prisma/client';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let prismaService: PrismaService;
  let devicesService: DevicesService;
  let featureFlags: FeatureFlagsService;
  let emailProvider: EmailProvider;
  let pushProvider: PushProvider;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      findFirst: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    notificationDelivery: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockDevicesService = {
    getPushTokensForUser: jest.fn(),
  };

  const mockFeatureFlags = {
    isEnabled: jest.fn(),
  };

  const mockEmailProvider: EmailProvider = {
    channel: 'email',
    providerName: 'sendgrid',
    isReady: jest.fn(),
    send: jest.fn(),
  };

  const mockPushProvider: PushProvider = {
    channel: 'push',
    providerName: 'fcm',
    isReady: jest.fn(),
    send: jest.fn(),
  };

  const mockPreferencesService = {
    getEnabledChannels: jest.fn(),
    getPreference: jest.fn(),
    isInQuietHours: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockQueueItem = {
    id: 'queue_123',
    userId: 'user_123',
    notificationType: NotificationType.MESSAGE_NEW,
    title: 'Test Notification',
    body: 'This is a test',
    data: { key: 'value' },
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
    correlationId: 'corr_123',
    idempotencyKey: null,
    deliveryResults: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: FeatureFlagsService,
          useValue: mockFeatureFlags,
        },
        {
          provide: DELIVERY_PROVIDERS.EMAIL,
          useValue: mockEmailProvider,
        },
        {
          provide: DELIVERY_PROVIDERS.PUSH,
          useValue: mockPushProvider,
        },
      ],
    }).compile();

    service = module.get<NotificationDeliveryService>(NotificationDeliveryService);
    prismaService = module.get<PrismaService>(PrismaService);
    devicesService = module.get<DevicesService>(DevicesService);
    featureFlags = module.get<FeatureFlagsService>(FeatureFlagsService);
    emailProvider = module.get<EmailProvider>(DELIVERY_PROVIDERS.EMAIL);
    pushProvider = module.get<PushProvider>(DELIVERY_PROVIDERS.PUSH);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deliverNotification', () => {
    const mockUser = {
      id: 'user_123',
      clerkId: 'clerk_123',
      userProfile: { name: 'Test User' },
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notificationDelivery.create.mockResolvedValue({});
    });

    it('should return error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.deliverNotification(mockQueueItem);

      expect(result.overallSuccess).toBe(false);
      expect(result.channelResults._error.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should deliver to push channel successfully', async () => {
      mockFeatureFlags.isEnabled.mockReturnValue(true);
      (mockPushProvider.isReady as jest.Mock).mockReturnValue(true);
      mockDevicesService.getPushTokensForUser.mockResolvedValue([
        'token_123456789012345678901234567890123456789012345678901234567890',
      ]);
      (mockPushProvider.send as jest.Mock).mockResolvedValue({
        success: true,
        providerMessageId: 'msg_123',
      });

      const result = await service.deliverNotification(mockQueueItem);

      expect(result.overallSuccess).toBe(true);
      expect(result.channelResults.push.success).toBe(true);
    });

    it('should deliver to in_app channel successfully', async () => {
      mockPrismaService.notification.create.mockResolvedValue({});

      const queueWithInApp = { ...mockQueueItem, channels: ['in_app'] };
      const result = await service.deliverNotification(queueWithInApp);

      expect(result.overallSuccess).toBe(true);
      expect(result.channelResults.in_app.success).toBe(true);
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it('should fail push delivery when feature is disabled', async () => {
      mockFeatureFlags.isEnabled.mockReturnValue(false);

      const result = await service.deliverNotification(mockQueueItem);

      expect(result.channelResults.push.success).toBe(false);
      expect(result.channelResults.push.errorCode).toBe('FEATURE_DISABLED');
    });

    it('should fail push delivery when provider not ready', async () => {
      mockFeatureFlags.isEnabled.mockReturnValue(true);
      (mockPushProvider.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.deliverNotification(mockQueueItem);

      expect(result.channelResults.push.success).toBe(false);
      expect(result.channelResults.push.errorCode).toBe('PROVIDER_NOT_READY');
    });

    it('should fail push delivery when user has no tokens', async () => {
      mockFeatureFlags.isEnabled.mockReturnValue(true);
      (mockPushProvider.isReady as jest.Mock).mockReturnValue(true);
      mockDevicesService.getPushTokensForUser.mockResolvedValue([]);

      const result = await service.deliverNotification(mockQueueItem);

      expect(result.channelResults.push.success).toBe(false);
      expect(result.channelResults.push.errorCode).toBe('NO_PUSH_TOKENS');
    });

    it('should record delivery attempts', async () => {
      mockFeatureFlags.isEnabled.mockReturnValue(true);
      (mockPushProvider.isReady as jest.Mock).mockReturnValue(true);
      mockDevicesService.getPushTokensForUser.mockResolvedValue([
        'token_123456789012345678901234567890123456789012345678901234567890',
      ]);
      (mockPushProvider.send as jest.Mock).mockResolvedValue({ success: true });

      await service.deliverNotification(mockQueueItem);

      expect(mockPrismaService.notificationDelivery.create).toHaveBeenCalledTimes(2); // push + in_app
    });
  });

  describe('isSecurityNotification', () => {
    it('should return true for ACCOUNT_SECURITY', () => {
      expect(service.isSecurityNotification(NotificationType.ACCOUNT_SECURITY)).toBe(
        true,
      );
    });

    it('should return false for non-security types', () => {
      expect(service.isSecurityNotification(NotificationType.MESSAGE_NEW)).toBe(false);
      expect(service.isSecurityNotification(NotificationType.PAYMENT_RECEIVED)).toBe(
        false,
      );
    });
  });

  describe('isMarketingNotification', () => {
    it('should return true for marketing types', () => {
      expect(service.isMarketingNotification(NotificationType.MARKETING_PROMO)).toBe(
        true,
      );
      expect(service.isMarketingNotification(NotificationType.MARKETING_NEWS)).toBe(
        true,
      );
    });

    it('should return false for non-marketing types', () => {
      expect(service.isMarketingNotification(NotificationType.MESSAGE_NEW)).toBe(false);
      expect(service.isMarketingNotification(NotificationType.PAYMENT_RECEIVED)).toBe(
        false,
      );
    });
  });

  describe('getDeliveryStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrismaService.notificationDelivery.groupBy.mockResolvedValue([
        { status: 'SENT', channel: 'push', _count: 100 },
        { status: 'SENT', channel: 'email', _count: 50 },
        { status: 'FAILED', channel: 'push', _count: 5 },
      ]);

      const since = new Date();
      const result = await service.getDeliveryStats(since);

      expect(result.total).toBe(155);
      expect(result.byStatus.SENT).toBe(150);
      expect(result.byStatus.FAILED).toBe(5);
      expect(result.byChannel.push).toBe(105);
      expect(result.byChannel.email).toBe(50);
    });
  });
});


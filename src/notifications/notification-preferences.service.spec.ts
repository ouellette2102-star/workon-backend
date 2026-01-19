import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, DigestFrequency } from '@prisma/client';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationPreference: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockUserId = 'user_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPreferences', () => {
    it('should return all preferences for a user', async () => {
      const mockPrefs = [
        { id: '1', userId: mockUserId, notificationType: NotificationType.MESSAGE_NEW },
        { id: '2', userId: mockUserId, notificationType: NotificationType.PAYMENT_RECEIVED },
      ];
      mockPrismaService.notificationPreference.findMany.mockResolvedValue(mockPrefs);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPrefs);
      expect(mockPrismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { notificationType: 'asc' },
      });
    });
  });

  describe('getPreference', () => {
    it('should return preference for specific type', async () => {
      const mockPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        pushEnabled: true,
        emailEnabled: false,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPref);

      const result = await service.getPreference(mockUserId, NotificationType.MESSAGE_NEW);

      expect(result).toEqual(mockPref);
    });

    it('should return null if preference does not exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreference(mockUserId, NotificationType.MARKETING_PROMO);

      expect(result).toBeNull();
    });
  });

  describe('getOrCreatePreference', () => {
    it('should return existing preference if found', async () => {
      const mockPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPref);

      const result = await service.getOrCreatePreference(mockUserId, NotificationType.MESSAGE_NEW);

      expect(result).toEqual(mockPref);
      expect(mockPrismaService.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('should create preference with defaults if not found', async () => {
      const mockCreatedPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        smsEnabled: false,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockCreatedPref);

      const result = await service.getOrCreatePreference(mockUserId, NotificationType.MESSAGE_NEW);

      expect(result).toEqual(mockCreatedPref);
      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe('updatePreference', () => {
    it('should update preference successfully', async () => {
      const mockUpdatedPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        pushEnabled: false,
        emailEnabled: true,
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(mockUpdatedPref);

      const result = await service.updatePreference(
        mockUserId,
        NotificationType.MESSAGE_NEW,
        { pushEnabled: false, emailEnabled: true },
      );

      expect(result).toEqual(mockUpdatedPref);
    });

    it('should throw BadRequestException for invalid quiet hours format', async () => {
      await expect(
        service.updatePreference(mockUserId, NotificationType.MESSAGE_NEW, {
          quietHoursStart: 'invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should force security notifications to stay enabled', async () => {
      const mockUpdatedPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.ACCOUNT_SECURITY,
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(mockUpdatedPref);

      await service.updatePreference(
        mockUserId,
        NotificationType.ACCOUNT_SECURITY,
        { pushEnabled: false, emailEnabled: false },
      );

      // Check that the call was made with forced enabled values
      expect(mockPrismaService.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            pushEnabled: true,
            emailEnabled: true,
            inAppEnabled: true,
          }),
        }),
      );
    });
  });

  describe('setQuietHours', () => {
    it('should set quiet hours for all preferences', async () => {
      mockPrismaService.notificationPreference.updateMany.mockResolvedValue({ count: 5 });

      await service.setQuietHours(mockUserId, '22:00', '08:00', 'America/Montreal');

      expect(mockPrismaService.notificationPreference.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'America/Montreal',
        },
      });
    });

    it('should throw BadRequestException for invalid time format', async () => {
      await expect(
        service.setQuietHours(mockUserId, '25:00', '08:00'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isInQuietHours', () => {
    it('should return false if quiet hours not set', () => {
      const pref = {
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'America/Toronto',
      } as any;

      expect(service.isInQuietHours(pref)).toBe(false);
    });

    // Note: Time-based tests are environment-dependent
    // In production, use proper timezone mocking
  });

  describe('getEnabledChannels', () => {
    it('should return enabled channels for a preference', async () => {
      const mockPref = {
        id: '1',
        userId: mockUserId,
        notificationType: NotificationType.MESSAGE_NEW,
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        smsEnabled: false,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPref);

      const channels = await service.getEnabledChannels(mockUserId, NotificationType.MESSAGE_NEW);

      expect(channels).toEqual(['push', 'in_app']);
    });
  });

  describe('unsubscribeFromMarketing', () => {
    it('should disable all marketing notification channels', async () => {
      mockPrismaService.notificationPreference.upsert.mockResolvedValue({});

      await service.unsubscribeFromMarketing(mockUserId);

      expect(mockPrismaService.notificationPreference.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDefaultsForType', () => {
    it('should return always-enabled defaults for security notifications', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockImplementation((args) => 
        Promise.resolve({ id: '1', ...args.data })
      );

      await service.getOrCreatePreference(mockUserId, NotificationType.ACCOUNT_SECURITY);

      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pushEnabled: true,
            emailEnabled: true,
            inAppEnabled: true,
          }),
        }),
      );
    });

    it('should return opt-in defaults for marketing notifications', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockImplementation((args) => 
        Promise.resolve({ id: '1', ...args.data })
      );

      await service.getOrCreatePreference(mockUserId, NotificationType.MARKETING_PROMO);

      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pushEnabled: false,
            emailEnabled: false,
            inAppEnabled: false,
          }),
        }),
      );
    });
  });
});


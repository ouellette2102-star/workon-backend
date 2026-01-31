import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { DevicesService } from '../devices/devices.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockPushService = {
    sendChatMessageNotification: jest.fn(),
  };

  const mockDevicesService = {
    getPushTokensForUser: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    clerkId: 'clerk-1',
  };

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'NEW_MESSAGE',
    payloadJSON: { missionId: 'mission-1' },
    readAt: null,
    createdAt: new Date('2026-01-30T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PushService, useValue: mockPushService },
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createForNewMessage', () => {
    it('should create notification and send push', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockDevicesService.getPushTokensForUser.mockResolvedValue(['token-1']);
      mockPushService.sendChatMessageNotification.mockResolvedValue(undefined);

      await service.createForNewMessage(
        'mission-1',
        'message-1',
        'clerk-1',
        'John',
        'Hello!',
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(mockPushService.sendChatMessageNotification).toHaveBeenCalledWith(
        ['token-1'],
        expect.objectContaining({
          missionId: 'mission-1',
          senderName: 'John',
          preview: 'Hello!',
        }),
      );
    });

    it('should skip if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.createForNewMessage(
        'mission-1',
        'message-1',
        'unknown-clerk',
        'John',
        'Hello!',
      );

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });

    it('should handle error gracefully', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createForNewMessage('mission-1', 'message-1', 'clerk-1'),
      ).resolves.not.toThrow();
    });

    it('should skip push if no tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockDevicesService.getPushTokensForUser.mockResolvedValue([]);

      await service.createForNewMessage('mission-1', 'message-1', 'clerk-1');

      expect(mockPushService.sendChatMessageNotification).not.toHaveBeenCalled();
    });
  });

  describe('createForMissionStatusChange', () => {
    it('should create notification for status change', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createForMissionStatusChange(
        'mission-1',
        'open',
        'in_progress',
        'clerk-1',
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'MISSION_STATUS_CHANGED',
          payloadJSON: {
            missionId: 'mission-1',
            statusBefore: 'open',
            statusAfter: 'in_progress',
          },
        }),
      });
    });

    it('should skip if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.createForMissionStatusChange(
        'mission-1',
        'open',
        'in_progress',
        'unknown-clerk',
      );

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('createForMissionTimeEvent', () => {
    it('should create notification for CHECK_IN event', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createForMissionTimeEvent('mission-1', 'CHECK_IN', 'clerk-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MISSION_TIME_EVENT',
          payloadJSON: {
            missionId: 'mission-1',
            eventType: 'CHECK_IN',
          },
        }),
      });
    });

    it('should create notification for CHECK_OUT event', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createForMissionTimeEvent('mission-1', 'CHECK_OUT', 'clerk-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payloadJSON: {
            missionId: 'mission-1',
            eventType: 'CHECK_OUT',
          },
        }),
      });
    });
  });

  describe('getNotifications', () => {
    it('should return all notifications for user', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.getNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].type).toBe('NEW_MESSAGE');
      expect(result[0].isRead).toBe(false);
    });

    it('should filter unread only', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      await service.getNotifications('user-1', true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            readAt: null,
          },
        }),
      );
    });

    it('should mark isRead true when readAt is set', async () => {
      const readNotif = {
        ...mockNotification,
        readAt: new Date('2026-01-30T12:00:00Z'),
      };
      mockPrismaService.notification.findMany.mockResolvedValue([readNotif]);

      const result = await service.getNotifications('user-1');

      expect(result[0].isRead).toBe(true);
      expect(result[0].readAt).toBe('2026-01-30T12:00:00.000Z');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.update.mockResolvedValue({});

      await service.markAsRead('notif-1');

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          readAt: null,
        },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('countUnread', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(10);

      const result = await service.countUnread('user-1');

      expect(result).toBe(10);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          readAt: null,
        },
      });
    });
  });
});

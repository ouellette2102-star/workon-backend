import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: any;

  const mockNotification: any = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'MISSION_ACCEPTED',
    title: 'Mission accepted',
    body: 'Your mission has been accepted',
    read: false,
    createdAt: new Date(),
  };

  const mockReq = { user: { userId: 'user-1', sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getNotifications: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return all notifications', async () => {
      service.getNotifications.mockResolvedValue([mockNotification]);

      const result = await controller.getNotifications(mockReq);

      expect(service.getNotifications).toHaveBeenCalledWith('user-1', false);
      expect(result).toHaveLength(1);
    });

    it('should filter by unreadOnly', async () => {
      service.getNotifications.mockResolvedValue([mockNotification]);

      await controller.getNotifications(mockReq, 'true');

      expect(service.getNotifications).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      service.countUnread.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockReq);

      expect(service.countUnread).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      service.markAsRead.mockResolvedValue(undefined);

      const result = await controller.markAsRead('notif-1', mockReq);

      expect(service.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException on error', async () => {
      service.markAsRead.mockRejectedValue(new Error('Not found'));

      await expect(controller.markAsRead('notif-1', mockReq)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      service.markAllAsRead.mockResolvedValue(undefined);

      const result = await controller.markAllAsRead(mockReq);

      expect(service.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });
  });
});

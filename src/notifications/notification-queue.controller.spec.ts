import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotificationQueueController } from './notification-queue.controller';
import { NotificationQueueService } from './notification-queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationQueueStatus } from '@prisma/client';

describe('NotificationQueueController', () => {
  let controller: NotificationQueueController;
  let service: any;

  const mockNotification: any = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'MISSION_STARTED',
    status: NotificationQueueStatus.PENDING,
    createdAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1', userId: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getUserNotificationHistory: jest.fn(),
      cancelNotification: jest.fn(),
      queueNotification: jest.fn(),
      processQueue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationQueueController],
      providers: [{ provide: NotificationQueueService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationQueueController>(NotificationQueueController);
    service = module.get(NotificationQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return notification history', async () => {
      const history = { items: [mockNotification], total: 1 };
      service.getUserNotificationHistory.mockResolvedValue(history);

      const result = await controller.getHistory(mockReq);

      expect(service.getUserNotificationHistory).toHaveBeenCalledWith('user-1', {
        limit: undefined,
        offset: undefined,
        status: undefined,
        notificationType: undefined,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should accept pagination parameters', async () => {
      const history = { items: [], total: 0 };
      service.getUserNotificationHistory.mockResolvedValue(history);

      await controller.getHistory(mockReq, '10', '5');

      expect(service.getUserNotificationHistory).toHaveBeenCalledWith('user-1', {
        limit: 10,
        offset: 5,
        status: undefined,
        notificationType: undefined,
      });
    });
  });

  describe('cancelNotification', () => {
    it('should cancel pending notification', async () => {
      const history = { items: [mockNotification], total: 1 };
      service.getUserNotificationHistory.mockResolvedValue(history);
      service.cancelNotification.mockResolvedValue({ success: true });

      const result = await controller.cancelNotification(mockReq, 'notif-1');

      expect(service.cancelNotification).toHaveBeenCalledWith('notif-1');
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if notification not found', async () => {
      const history = { items: [], total: 0 };
      service.getUserNotificationHistory.mockResolvedValue(history);

      await expect(
        controller.cancelNotification(mockReq, 'non-existent'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if notification not pending', async () => {
      const sentNotif = { ...mockNotification, status: NotificationQueueStatus.DELIVERED };
      const history = { items: [sentNotif], total: 1 };
      service.getUserNotificationHistory.mockResolvedValue(history);

      await expect(
        controller.cancelNotification(mockReq, 'notif-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

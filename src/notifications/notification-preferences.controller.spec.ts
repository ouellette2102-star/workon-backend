import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationType } from '@prisma/client';

describe('NotificationPreferencesController', () => {
  let controller: NotificationPreferencesController;
  let service: any;

  const mockPref: any = {
    id: 'pref-1',
    userId: 'user-1',
    notificationType: NotificationType.MISSION_STARTED,
    push: true,
    email: true,
    sms: false,
  };

  const mockReq = { user: { sub: 'user-1', userId: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getUserPreferences: jest.fn(),
      getOrCreatePreference: jest.fn(),
      updatePreference: jest.fn(),
      setQuietHours: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
      providers: [
        { provide: NotificationPreferencesService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationPreferencesController>(
      NotificationPreferencesController,
    );
    service = module.get(NotificationPreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return all user preferences', async () => {
      service.getUserPreferences.mockResolvedValue([mockPref]);

      const result = await controller.getPreferences(mockReq);

      expect(service.getUserPreferences).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getPreference', () => {
    it('should return preference for notification type', async () => {
      service.getOrCreatePreference.mockResolvedValue(mockPref);

      const result = await controller.getPreference(
        mockReq,
        NotificationType.MISSION_STARTED,
      );

      expect(service.getOrCreatePreference).toHaveBeenCalledWith(
        'user-1',
        NotificationType.MISSION_STARTED,
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid type', async () => {
      await expect(
        controller.getPreference(mockReq, 'INVALID_TYPE'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePreference', () => {
    it('should update preference', async () => {
      const dto = { push: false, email: true };
      service.updatePreference.mockResolvedValue({ ...mockPref, push: false });

      const result = await controller.updatePreference(
        mockReq,
        NotificationType.MISSION_STARTED,
        dto as any,
      );

      expect(service.updatePreference).toHaveBeenCalledWith(
        'user-1',
        NotificationType.MISSION_STARTED,
        dto,
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid type', async () => {
      await expect(
        controller.updatePreference(mockReq, 'INVALID_TYPE', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setQuietHours', () => {
    it('should set quiet hours', async () => {
      const dto = { quietHoursStart: '22:00', quietHoursEnd: '07:00', timezone: 'America/Montreal' };
      service.setQuietHours.mockResolvedValue(undefined);

      const result = await controller.setQuietHours(mockReq, dto as any);

      expect(service.setQuietHours).toHaveBeenCalledWith(
        'user-1',
        '22:00',
        '07:00',
        'America/Montreal',
      );
      expect(result).toEqual({ success: true, message: 'Quiet hours updated' });
    });
  });
});

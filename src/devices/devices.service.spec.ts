import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { DevicePlatform } from './dto/register-device.dto';

describe('DevicesService', () => {
  let service: DevicesService;

  const mockPrismaService = {
    device: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    localDevice: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDevice = {
    id: 'device_1',
    userId: 'user_1',
    deviceId: 'device_abc123',
    platform: 'android',
    pushToken: 'fcm_token_123',
    appVersion: '1.0.0',
    active: true,
    lastSeenAt: new Date('2026-01-30'),
    createdAt: new Date('2026-01-01'),
  };

  const mockLocalDevice = {
    ...mockDevice,
    id: 'local_device_1',
    userId: 'local_user_1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  describe('registerDevice', () => {
    it('should register a new device for regular user', async () => {
      mockPrismaService.device.upsert.mockResolvedValue(mockDevice);

      const result = await service.registerDevice('user_1', {
        deviceId: 'device_abc123',
        platform: DevicePlatform.ANDROID,
        pushToken: 'fcm_token_123',
        appVersion: '1.0.0',
      });

      expect(result.id).toBe('device_1');
      expect(result.platform).toBe('android');
      expect(mockPrismaService.device.upsert).toHaveBeenCalled();
    });

    it('should register a device for local user', async () => {
      mockPrismaService.localDevice.upsert.mockResolvedValue(mockLocalDevice);

      const result = await service.registerDevice('local_user_1', {
        deviceId: 'device_abc123',
        platform: DevicePlatform.IOS,
        pushToken: 'apns_token_123',
      });

      expect(result.id).toBe('local_device_1');
      expect(mockPrismaService.localDevice.upsert).toHaveBeenCalled();
      expect(mockPrismaService.device.upsert).not.toHaveBeenCalled();
    });

    it('should update existing device on re-registration', async () => {
      mockPrismaService.device.upsert.mockResolvedValue({
        ...mockDevice,
        pushToken: 'new_token',
      });

      const result = await service.registerDevice('user_1', {
        deviceId: 'device_abc123',
        platform: DevicePlatform.ANDROID,
        pushToken: 'new_token',
      });

      expect(result.pushToken).toBe('new_token');
    });
  });

  describe('getMyDevices', () => {
    it('should return all active devices for regular user', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([mockDevice]);

      const result = await service.getMyDevices('user_1');

      expect(result).toHaveLength(1);
      expect(result[0].deviceId).toBe('device_abc123');
    });

    it('should return devices for local user', async () => {
      mockPrismaService.localDevice.findMany.mockResolvedValue([mockLocalDevice]);

      const result = await service.getMyDevices('local_user_1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.localDevice.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no devices', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([]);

      const result = await service.getMyDevices('user_no_devices');

      expect(result).toEqual([]);
    });
  });

  describe('deleteDevice', () => {
    it('should soft-delete device for regular user', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      mockPrismaService.device.update.mockResolvedValue({
        ...mockDevice,
        active: false,
      });

      await service.deleteDevice('user_1', 'device_1');

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { id: 'device_1' },
        data: { active: false },
      });
    });

    it('should soft-delete device for local user', async () => {
      mockPrismaService.localDevice.findUnique.mockResolvedValue(mockLocalDevice);
      mockPrismaService.localDevice.update.mockResolvedValue({
        ...mockLocalDevice,
        active: false,
      });

      await service.deleteDevice('local_user_1', 'local_device_1');

      expect(mockPrismaService.localDevice.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(service.deleteDevice('user_1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user does not own device', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        userId: 'other_user',
      });

      await expect(service.deleteDevice('user_1', 'device_1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePushToken', () => {
    it('should update push token for regular user', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.device.update.mockResolvedValue({
        ...mockDevice,
        pushToken: 'new_push_token',
      });

      const result = await service.updatePushToken(
        'user_1',
        'device_abc123',
        'new_push_token',
      );

      expect(result.pushToken).toBe('new_push_token');
    });

    it('should update push token for local user', async () => {
      mockPrismaService.localDevice.findFirst.mockResolvedValue(mockLocalDevice);
      mockPrismaService.localDevice.update.mockResolvedValue({
        ...mockLocalDevice,
        pushToken: 'new_local_token',
      });

      const result = await service.updatePushToken(
        'local_user_1',
        'device_abc123',
        'new_local_token',
      );

      expect(result.pushToken).toBe('new_local_token');
    });

    it('should throw NotFoundException if device not found', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePushToken('user_1', 'nonexistent', 'token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPushTokensForUser', () => {
    it('should return push tokens for regular user', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([
        { pushToken: 'token_1' },
        { pushToken: 'token_2' },
      ]);

      const result = await service.getPushTokensForUser('user_1');

      expect(result).toEqual(['token_1', 'token_2']);
    });

    it('should return push tokens for local user', async () => {
      mockPrismaService.localDevice.findMany.mockResolvedValue([
        { pushToken: 'local_token_1' },
        { pushToken: null },
        { pushToken: 'local_token_2' },
      ]);

      const result = await service.getPushTokensForUser('local_user_1');

      expect(result).toEqual(['local_token_1', 'local_token_2']);
    });

    it('should filter out null tokens', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([
        { pushToken: 'token_1' },
        { pushToken: null },
      ]);

      const result = await service.getPushTokensForUser('user_1');

      expect(result).toEqual(['token_1']);
    });
  });
});

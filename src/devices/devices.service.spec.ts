import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevicePlatform } from './dto/register-device.dto';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const mockDevice = {
    id: 'device-uuid-1',
    userId: 'user-1',
    deviceId: 'device-id-123',
    platform: 'ios',
    pushToken: 'fcm-token-abc',
    appVersion: '1.0.0',
    active: true,
    lastSeenAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  const createMockPrisma = () => ({
    device: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      mockPrisma.device.upsert.mockResolvedValue(mockDevice);

      const result = await service.registerDevice('user-1', {
        deviceId: 'device-id-123',
        platform: DevicePlatform.IOS,
        pushToken: 'fcm-token-abc',
        appVersion: '1.0.0',
      });

      expect(result.deviceId).toBe('device-id-123');
      expect(result.platform).toBe('ios');
      expect(result.pushToken).toBe('fcm-token-abc');
      expect(mockPrisma.device.upsert).toHaveBeenCalledWith({
        where: {
          userId_deviceId: {
            userId: 'user-1',
            deviceId: 'device-id-123',
          },
        },
        update: expect.objectContaining({
          platform: 'ios',
          pushToken: 'fcm-token-abc',
          active: true,
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          deviceId: 'device-id-123',
          platform: 'ios',
        }),
      });
    });

    it('should update existing device on re-register', async () => {
      const updatedDevice = { ...mockDevice, appVersion: '2.0.0' };
      mockPrisma.device.upsert.mockResolvedValue(updatedDevice);

      const result = await service.registerDevice('user-1', {
        deviceId: 'device-id-123',
        platform: DevicePlatform.IOS,
        pushToken: 'new-token',
        appVersion: '2.0.0',
      });

      expect(result.appVersion).toBe('2.0.0');
    });

    it('should register device without optional fields', async () => {
      const deviceNoOptional = {
        ...mockDevice,
        pushToken: null,
        appVersion: null,
      };
      mockPrisma.device.upsert.mockResolvedValue(deviceNoOptional);

      const result = await service.registerDevice('user-1', {
        deviceId: 'device-id-123',
        platform: DevicePlatform.ANDROID,
      });

      expect(result.pushToken).toBeUndefined();
      expect(result.appVersion).toBeUndefined();
    });
  });

  describe('getMyDevices', () => {
    it('should return all active devices for user', async () => {
      const devices = [
        mockDevice,
        { ...mockDevice, id: 'device-uuid-2', deviceId: 'device-id-456', platform: 'android' },
      ];
      mockPrisma.device.findMany.mockResolvedValue(devices);

      const result = await service.getMyDevices('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('ios');
      expect(result[1].platform).toBe('android');
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          active: true,
        },
        orderBy: { lastSeenAt: 'desc' },
      });
    });

    it('should return empty array for user with no devices', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      const result = await service.getMyDevices('user-no-devices');

      expect(result).toEqual([]);
    });

    it('should not return inactive devices', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      await service.getMyDevices('user-1');

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });
  });

  describe('deleteDevice', () => {
    it('should soft-delete device owned by user', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue({ ...mockDevice, active: false });

      await service.deleteDevice('user-1', 'device-uuid-1');

      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-uuid-1' },
        data: { active: false },
      });
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDevice('user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if device belongs to another user', async () => {
      mockPrisma.device.findUnique.mockResolvedValue({
        ...mockDevice,
        userId: 'other-user',
      });

      await expect(
        service.deleteDevice('user-1', 'device-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePushToken', () => {
    it('should update push token for existing device', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue({
        ...mockDevice,
        pushToken: 'new-push-token',
      });

      const result = await service.updatePushToken(
        'user-1',
        'device-id-123',
        'new-push-token',
      );

      expect(result.pushToken).toBe('new-push-token');
      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-uuid-1' },
        data: {
          pushToken: 'new-push-token',
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePushToken('user-1', 'unknown-device', 'token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only find active devices', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(null);

      await service
        .updatePushToken('user-1', 'device-id', 'token')
        .catch(() => {});

      expect(mockPrisma.device.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          deviceId: 'device-id',
          active: true,
        },
      });
    });
  });

  describe('getPushTokensForUser', () => {
    it('should return all push tokens for user', async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { pushToken: 'token-1' },
        { pushToken: 'token-2' },
        { pushToken: 'token-3' },
      ] as any);

      const result = await service.getPushTokensForUser('user-1');

      expect(result).toEqual(['token-1', 'token-2', 'token-3']);
    });

    it('should filter out null tokens', async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { pushToken: 'token-1' },
        { pushToken: null },
        { pushToken: 'token-2' },
      ] as any);

      const result = await service.getPushTokensForUser('user-1');

      expect(result).toEqual(['token-1', 'token-2']);
    });

    it('should return empty array for user with no tokens', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      const result = await service.getPushTokensForUser('user-no-tokens');

      expect(result).toEqual([]);
    });

    it('should query only active devices with tokens', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      await service.getPushTokensForUser('user-1');

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          active: true,
          pushToken: { not: null },
        },
        select: { pushToken: true },
      });
    });
  });

  describe('response mapping', () => {
    it('should map device to response DTO correctly', async () => {
      mockPrisma.device.upsert.mockResolvedValue(mockDevice);

      const result = await service.registerDevice('user-1', {
        deviceId: 'device-id-123',
        platform: DevicePlatform.IOS,
        pushToken: 'fcm-token-abc',
        appVersion: '1.0.0',
      });

      expect(result).toEqual({
        id: 'device-uuid-1',
        userId: 'user-1',
        deviceId: 'device-id-123',
        platform: 'ios',
        pushToken: 'fcm-token-abc',
        appVersion: '1.0.0',
        active: true,
        lastSeenAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });

    it('should handle null optional fields in response', async () => {
      const deviceWithNulls = {
        ...mockDevice,
        pushToken: null,
        appVersion: null,
      };
      mockPrisma.device.upsert.mockResolvedValue(deviceWithNulls);

      const result = await service.registerDevice('user-1', {
        deviceId: 'device-id-123',
        platform: DevicePlatform.IOS,
      });

      // null fields should be undefined in response
      expect(result.pushToken).toBeUndefined();
      expect(result.appVersion).toBeUndefined();
    });
  });
});


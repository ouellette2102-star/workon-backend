import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicePlatform } from './dto/register-device.dto';

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: any;

  const mockDevice: any = {
    id: 'device-1',
    userId: 'user-1',
    fcmToken: 'fcm-token-123',
    platform: DevicePlatform.IOS,
    deviceModel: 'iPhone 14',
    osVersion: '16.0',
    appVersion: '1.0.0',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReq = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      registerDevice: jest.fn(),
      getMyDevices: jest.fn(),
      deleteDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a device', async () => {
      const dto = {
        fcmToken: 'fcm-token-123',
        platform: DevicePlatform.IOS,
        deviceModel: 'iPhone 14',
        osVersion: '16.0',
        appVersion: '1.0.0',
      };
      service.registerDevice.mockResolvedValue(mockDevice);

      const result = await controller.registerDevice(mockReq, dto as any);

      expect(service.registerDevice).toHaveBeenCalledWith('user-1', dto);
      expect(result).toBeDefined();
    });
  });

  describe('getMyDevices', () => {
    it('should return user devices', async () => {
      service.getMyDevices.mockResolvedValue([mockDevice]);

      const result = await controller.getMyDevices(mockReq);

      expect(service.getMyDevices).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteDevice', () => {
    it('should delete a device', async () => {
      service.deleteDevice.mockResolvedValue(undefined);

      await controller.deleteDevice(mockReq, 'device-1');

      expect(service.deleteDevice).toHaveBeenCalledWith('user-1', 'device-1');
    });
  });
});

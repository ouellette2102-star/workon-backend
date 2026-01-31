import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let configService: jest.Mocked<ConfigService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      switch (key) {
        case 'NODE_ENV':
          return 'development';
        case 'STRIPE_SECRET_KEY':
          return 'sk_test_123';
        case 'STRIPE_WEBHOOK_SECRET':
          return 'whsec_123';
        case 'SIGNED_URL_SECRET':
          return 'signed_secret';
        default:
          return defaultValue;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    configService = module.get(ConfigService);
    prisma = module.get(PrismaService);
  });

  describe('getHealth', () => {
    it('should return ok status when all services are healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.storage.status).toBe('ok');
    });

    it('should return degraded status when database is slow', async () => {
      // Simulate slow database response
      mockPrismaService.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([{ '?column?': 1 }]), 1100);
          }),
      );

      const result = await controller.getHealth();

      expect(result.checks.database.status).toBe('degraded');
    });

    it('should return error status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.getHealth();

      expect(result.status).toBe('error');
      expect(result.checks.database.status).toBe('error');
    });

    it('should return degraded when stripe webhook secret is missing', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return undefined;
        return undefined;
      });

      const result = await controller.getHealth();

      expect(result.checks.stripe.status).toBe('degraded');
    });

    it('should include system metrics', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.getHealth();

      expect(result.system).toBeDefined();
      expect(result.system?.memoryUsageMB).toBeGreaterThan(0);
      expect(result.system?.heapUsedMB).toBeGreaterThan(0);
    });

    it('should include uptime', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.getHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReady', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should return 200 when database is ready', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await controller.getReady(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
        }),
      );
    });

    it('should return 503 when database is not ready', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      await controller.getReady(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
        }),
      );
    });
  });

  describe('checkSignedUrls', () => {
    it('should return error in production without secret', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'SIGNED_URL_SECRET') return undefined;
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_123';
        return undefined;
      });

      const result = await controller.getHealth();

      expect(result.checks.signedUrls.status).toBe('error');
    });

    it('should return degraded in development without secret', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SIGNED_URL_SECRET') return undefined;
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_123';
        return undefined;
      });

      const result = await controller.getHealth();

      expect(result.checks.signedUrls.status).toBe('degraded');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NODE_ENV: 'test',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
        SIGNED_URL_SECRET: 'test-secret',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('/healthz (liveness probe)', () => {
    it('should return status alive immediately', () => {
      const result = controller.getLiveness();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });

    it('should NOT require database connection', () => {
      // This test verifies that getLiveness() does NOT call Prisma
      const result = controller.getLiveness();
      
      expect(result.status).toBe('alive');
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('/api/v1/health (detailed health)', () => {
    it('should return health status with checks', async () => {
      const result = await controller.getHealth();
      
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.checks).toBeDefined();
    });
  });
});


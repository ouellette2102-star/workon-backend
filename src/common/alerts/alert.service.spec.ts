import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertService, AlertSeverity } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;

  const mockConfigGet = jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      ALERTS_ENABLED: '1',
    };
    return config[key] ?? defaultValue;
  });

  beforeEach(async () => {
    mockConfigGet.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: ConfigService, useValue: { get: mockConfigGet } },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendAlert', () => {
    it('should log alert without throwing', async () => {
      await expect(
        service.sendAlert({
          severity: 'critical',
          title: 'Test Alert',
          message: 'This is a test',
          source: 'AlertService.spec',
        }),
      ).resolves.not.toThrow();
    });

    it('should handle all severity levels', async () => {
      const severities: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

      for (const severity of severities) {
        await expect(
          service.sendAlert({
            severity,
            title: `${severity} Alert`,
            message: 'Test message',
            source: 'AlertService.spec',
          }),
        ).resolves.not.toThrow();
      }
    });

    it('should accept optional metadata', async () => {
      await expect(
        service.sendAlert({
          severity: 'high',
          title: 'Alert with metadata',
          message: 'Test',
          source: 'AlertService.spec',
          correlationId: 'test-correlation-id',
          metadata: { userId: 'user_123', action: 'test' },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('convenience methods', () => {
    it('should have critical() convenience method', async () => {
      await expect(
        service.critical('Critical', 'Message', 'Source'),
      ).resolves.not.toThrow();
    });

    it('should have high() convenience method', async () => {
      await expect(
        service.high('High', 'Message', 'Source'),
      ).resolves.not.toThrow();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { AlertService, AlertPayload } from './alert.service';
import { ConfigService } from '@nestjs/config';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('AlertService', () => {
  let service: AlertService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Default config
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NODE_ENV: 'development',
        ALERTS_ENABLED: '1',
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  describe('constructor', () => {
    it('should initialize without webhook URL in development', () => {
      expect(service).toBeDefined();
    });
  });

  describe('sendAlert', () => {
    it('should log alert when no webhook configured', async () => {
      const payload: AlertPayload = {
        severity: 'critical',
        title: 'Test Alert',
        message: 'Test message',
        source: 'TestService',
      };

      await expect(service.sendAlert(payload)).resolves.not.toThrow();
    });

    it('should skip webhook when alerts disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          ALERTS_ENABLED: '0',
          ALERT_WEBHOOK_URL: 'https://hooks.slack.com/test',
        };
        return config[key] ?? defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlertService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<AlertService>(AlertService);

      const payload: AlertPayload = {
        severity: 'critical',
        title: 'Test Alert',
        message: 'Test message',
        source: 'TestService',
      };

      await testService.sendAlert(payload);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send to Slack webhook in production', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          ALERTS_ENABLED: '1',
          ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/test',
        };
        return config[key] ?? defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlertService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<AlertService>(AlertService);

      mockFetch.mockResolvedValue({ ok: true });

      const payload: AlertPayload = {
        severity: 'critical',
        title: 'Test Alert',
        message: 'Test message',
        source: 'TestService',
      };

      await testService.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should send to Discord webhook in production', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          ALERTS_ENABLED: '1',
          ALERT_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
        };
        return config[key] ?? defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlertService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<AlertService>(AlertService);

      mockFetch.mockResolvedValue({ ok: true });

      const payload: AlertPayload = {
        severity: 'high',
        title: 'Test Alert',
        message: 'Test message',
        source: 'TestService',
        correlationId: 'corr-123',
      };

      await testService.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle webhook error gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          ALERTS_ENABLED: '1',
          ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/test',
        };
        return config[key] ?? defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlertService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<AlertService>(AlertService);

      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const payload: AlertPayload = {
        severity: 'critical',
        title: 'Test Alert',
        message: 'Test message',
        source: 'TestService',
      };

      // Should not throw
      await expect(testService.sendAlert(payload)).resolves.not.toThrow();
    });
  });

  describe('convenience methods', () => {
    it('should send critical alert', async () => {
      await service.critical('Title', 'Message', 'Source', { key: 'value' });
      // Just verify it doesn't throw
    });

    it('should send high severity alert', async () => {
      await service.high('Title', 'Message', 'Source');
      // Just verify it doesn't throw
    });
  });
});

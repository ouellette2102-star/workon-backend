import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService, FeatureFlags } from './feature-flags.service';
import { ConfigService } from '@nestjs/config';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get(ConfigService);
  });

  describe('onModuleInit', () => {
    it('should load flags on init', () => {
      mockConfigService.get.mockReturnValue(undefined);

      service.onModuleInit();

      // Should have loaded all flags
      expect(service.getFlagsSummary().total).toBeGreaterThan(0);
    });

    it('should load enabled flags from environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FEATURE_DEBUG_MODE_ENABLED') return 'true';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isEnabled('DEBUG_MODE_ENABLED')).toBe(true);
    });

    it('should load flags with 1 as truthy value', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FEATURE_PUSH_NOTIFICATIONS_ENABLED') return '1';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isEnabled('PUSH_NOTIFICATIONS_ENABLED')).toBe(true);
    });
  });

  describe('isEnabled', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return default value for PAYMENTS_ENABLED', () => {
      // PAYMENTS_ENABLED defaults to true
      expect(service.isEnabled(FeatureFlags.PAYMENTS_ENABLED)).toBe(true);
    });

    it('should return default value for PUSH_NOTIFICATIONS_ENABLED', () => {
      // PUSH_NOTIFICATIONS_ENABLED defaults to false
      expect(service.isEnabled(FeatureFlags.PUSH_NOTIFICATIONS_ENABLED)).toBe(false);
    });

    it('should return false for unknown flag', () => {
      expect(service.isEnabled('UNKNOWN_FLAG')).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return all flags with their status and description', () => {
      const flags = service.getAllFlags();

      expect(flags).toHaveProperty('PAYMENTS_ENABLED');
      expect(flags.PAYMENTS_ENABLED).toEqual({
        enabled: true,
        description: 'Enable payment processing',
      });

      expect(flags).toHaveProperty('DEBUG_MODE_ENABLED');
      expect(flags.DEBUG_MODE_ENABLED).toEqual({
        enabled: false,
        description: 'Enable debug mode',
      });
    });
  });

  describe('getFlagsSummary', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return flags summary', () => {
      const summary = service.getFlagsSummary();

      expect(summary.total).toBeGreaterThan(0);
      expect(summary.enabled + summary.disabled).toBe(summary.total);
    });
  });

  describe('requireFeature', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should not throw for enabled feature', () => {
      expect(() => service.requireFeature(FeatureFlags.PAYMENTS_ENABLED)).not.toThrow();
    });

    it('should throw for disabled feature', () => {
      expect(() => service.requireFeature(FeatureFlags.DEBUG_MODE_ENABLED)).toThrow();
    });

    it('should throw with custom error message', () => {
      expect(() =>
        service.requireFeature(FeatureFlags.DEBUG_MODE_ENABLED, 'Custom error'),
      ).toThrow('Custom error');
    });
  });

  describe('checkFeature', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return true for enabled feature', () => {
      expect(service.checkFeature(FeatureFlags.PAYMENTS_ENABLED)).toBe(true);
    });

    it('should return false for disabled feature', () => {
      expect(service.checkFeature(FeatureFlags.DEBUG_MODE_ENABLED)).toBe(false);
    });
  });

  describe('production environment warnings', () => {
    it('should log error for dangerous flags in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'FEATURE_DEBUG_MODE_ENABLED') return 'true';
        return undefined;
      });

      // The logger should warn but not throw
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});

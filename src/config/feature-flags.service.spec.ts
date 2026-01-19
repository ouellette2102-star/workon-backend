import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService, FeatureFlags } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load flags on module init', () => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
      expect(mockConfigService.get).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return default value for core features', () => {
      expect(service.isEnabled(FeatureFlags.PAYMENTS_ENABLED)).toBe(true);
      expect(service.isEnabled(FeatureFlags.AUTH_ENABLED)).toBe(true);
    });

    it('should return false for disabled features by default', () => {
      expect(service.isEnabled(FeatureFlags.DISPUTE_SYSTEM_ENABLED)).toBe(false);
      expect(service.isEnabled(FeatureFlags.BOOKING_SYSTEM_ENABLED)).toBe(false);
    });

    it('should return false for unknown flags', () => {
      expect(service.isEnabled('UNKNOWN_FLAG')).toBe(false);
    });
  });

  describe('environment override', () => {
    it('should enable flag when env var is set to 1', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FEATURE_DISPUTE_SYSTEM_ENABLED') return '1';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isEnabled(FeatureFlags.DISPUTE_SYSTEM_ENABLED)).toBe(true);
    });

    it('should enable flag when env var is set to true', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FEATURE_BOOKING_SYSTEM_ENABLED') return 'true';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isEnabled(FeatureFlags.BOOKING_SYSTEM_ENABLED)).toBe(true);
    });

    it('should disable flag when env var is set to 0', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FEATURE_PAYMENTS_ENABLED') return '0';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isEnabled(FeatureFlags.PAYMENTS_ENABLED)).toBe(false);
    });
  });

  describe('requireFeature', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should not throw for enabled features', () => {
      expect(() => {
        service.requireFeature(FeatureFlags.PAYMENTS_ENABLED);
      }).not.toThrow();
    });

    it('should throw for disabled features', () => {
      expect(() => {
        service.requireFeature(FeatureFlags.DISPUTE_SYSTEM_ENABLED);
      }).toThrow('Feature DISPUTE_SYSTEM_ENABLED is not enabled');
    });

    it('should throw with custom error message', () => {
      expect(() => {
        service.requireFeature(FeatureFlags.DISPUTE_SYSTEM_ENABLED, 'Custom error');
      }).toThrow('Custom error');
    });
  });

  describe('getAllFlags', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return all flags with their status', () => {
      const flags = service.getAllFlags();

      expect(flags).toHaveProperty(FeatureFlags.PAYMENTS_ENABLED);
      expect(flags[FeatureFlags.PAYMENTS_ENABLED]).toEqual({
        enabled: true,
        description: expect.any(String),
      });

      expect(flags).toHaveProperty(FeatureFlags.DISPUTE_SYSTEM_ENABLED);
      expect(flags[FeatureFlags.DISPUTE_SYSTEM_ENABLED]).toEqual({
        enabled: false,
        description: expect.any(String),
      });
    });
  });

  describe('getFlagsSummary', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return correct summary', () => {
      const summary = service.getFlagsSummary();

      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('enabled');
      expect(summary).toHaveProperty('disabled');
      expect(summary.total).toBe(summary.enabled + summary.disabled);
    });
  });

  describe('checkFeature', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('should return boolean for enabled feature', () => {
      expect(service.checkFeature(FeatureFlags.PAYMENTS_ENABLED)).toBe(true);
    });

    it('should return boolean for disabled feature', () => {
      expect(service.checkFeature(FeatureFlags.DISPUTE_SYSTEM_ENABLED)).toBe(false);
    });
  });
});


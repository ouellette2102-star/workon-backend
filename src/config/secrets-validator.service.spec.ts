import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsValidatorService } from './secrets-validator.service';

describe('SecretsValidatorService', () => {
  let service: SecretsValidatorService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsValidatorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SecretsValidatorService>(SecretsValidatorService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should validate secrets on module init in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DATABASE_URL') return 'postgresql://user:pass@localhost:5432/db';
        if (key === 'JWT_SECRET') return 'super-secret-jwt-key-minimum-32-characters-long';
        return undefined;
      });

      // Should not throw in development even with missing optional secrets
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('hasSecret', () => {
    it('should return true when secret is set', () => {
      mockConfigService.get.mockReturnValue('some-value');
      expect(service.hasSecret('DATABASE_URL')).toBe(true);
    });

    it('should return false when secret is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.hasSecret('DATABASE_URL')).toBe(false);
    });

    it('should return false when secret is empty string', () => {
      mockConfigService.get.mockReturnValue('');
      expect(service.hasSecret('DATABASE_URL')).toBe(false);
    });
  });

  describe('isStripeConfigured', () => {
    it('should return true when both Stripe secrets are set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_xxx';
        return undefined;
      });

      expect(service.isStripeConfigured()).toBe(true);
    });

    it('should return false when only STRIPE_SECRET_KEY is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
        return undefined;
      });

      expect(service.isStripeConfigured()).toBe(false);
    });

    it('should return false when only STRIPE_WEBHOOK_SECRET is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_xxx';
        return undefined;
      });

      expect(service.isStripeConfigured()).toBe(false);
    });
  });

  describe('isClerkConfigured', () => {
    it('should return true when both Clerk secrets are set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_xxx';
        if (key === 'CLERK_PUBLISHABLE_KEY') return 'pk_xxx';
        return undefined;
      });

      expect(service.isClerkConfigured()).toBe(true);
    });

    it('should return false when Clerk secrets are not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.isClerkConfigured()).toBe(false);
    });
  });

  describe('isPushConfigured', () => {
    it('should return true when Firebase project ID is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FIREBASE_PROJECT_ID') return 'my-project';
        return undefined;
      });

      expect(service.isPushConfigured()).toBe(true);
    });

    it('should return false when Firebase is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.isPushConfigured()).toBe(false);
    });
  });

  describe('isSentryConfigured', () => {
    it('should return true when Sentry DSN is set', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENTRY_DSN') return 'https://xxx@xxx.ingest.sentry.io/xxx';
        return undefined;
      });

      expect(service.isSentryConfigured()).toBe(true);
    });

    it('should return false when Sentry is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.isSentryConfigured()).toBe(false);
    });
  });

  describe('getSecretsStatus', () => {
    it('should return status for all secrets', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DATABASE_URL') return 'postgresql://user:pass@localhost:5432/db';
        return undefined;
      });

      const status = service.getSecretsStatus();

      expect(status).toHaveProperty('DATABASE_URL');
      expect(status.DATABASE_URL).toEqual({
        configured: true,
        required: true,
      });

      expect(status).toHaveProperty('STRIPE_SECRET_KEY');
      expect(status.STRIPE_SECRET_KEY).toEqual({
        configured: false,
        required: false, // Not required in development
      });
    });

    it('should mark secrets as required in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const status = service.getSecretsStatus();

      expect(status.STRIPE_SECRET_KEY.required).toBe(true);
      expect(status.SENTRY_DSN.required).toBe(true);
    });
  });

  describe('production validation', () => {
    it('should throw in production when required secrets are missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        // Missing all required secrets
        return undefined;
      });

      expect(() => service.onModuleInit()).toThrow('Secret validation failed');
    });

    it('should not throw in production when all required secrets are present', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DATABASE_URL') return 'postgresql://user:pass@host:5432/db';
        if (key === 'JWT_SECRET') return 'super-secret-jwt-key-minimum-32-characters-long';
        if (key === 'CLERK_SECRET_KEY') return 'sk_live_xxx';
        if (key === 'CLERK_PUBLISHABLE_KEY') return 'pk_live_xxx';
        if (key === 'STRIPE_SECRET_KEY') return 'sk_live_xxx';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_xxx';
        if (key === 'STORAGE_BUCKET') return 'my-bucket';
        if (key === 'SENTRY_DSN') return 'https://xxx@xxx.ingest.sentry.io/xxx';
        return undefined;
      });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});


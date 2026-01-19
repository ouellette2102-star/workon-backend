import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Secrets Validator Service
 * PR-11: Production Configuration
 *
 * Validates all required secrets on application startup.
 * Fails fast if critical secrets are missing or malformed.
 *
 * SECURITY: Never log secret values, only validation status.
 */
@Injectable()
export class SecretsValidatorService implements OnModuleInit {
  private readonly logger = new Logger(SecretsValidatorService.name);

  /**
   * Secret definitions with validation rules
   */
  private readonly SECRET_DEFINITIONS: Record<
    string,
    {
      required: boolean;
      requiredInProd: boolean;
      pattern?: RegExp;
      minLength?: number;
      description: string;
    }
  > = {
    // Database
    DATABASE_URL: {
      required: true,
      requiredInProd: true,
      pattern: /^postgres(ql)?:\/\/.+/,
      description: 'PostgreSQL connection string',
    },

    // Authentication
    JWT_SECRET: {
      required: true,
      requiredInProd: true,
      minLength: 32,
      description: 'JWT signing secret (min 32 chars)',
    },
    CLERK_SECRET_KEY: {
      required: false,
      requiredInProd: true,
      pattern: /^sk_/,
      description: 'Clerk secret key',
    },
    CLERK_PUBLISHABLE_KEY: {
      required: false,
      requiredInProd: true,
      pattern: /^pk_/,
      description: 'Clerk publishable key',
    },

    // Stripe
    STRIPE_SECRET_KEY: {
      required: false,
      requiredInProd: true,
      pattern: /^sk_(live|test)_/,
      description: 'Stripe secret key',
    },
    STRIPE_WEBHOOK_SECRET: {
      required: false,
      requiredInProd: true,
      pattern: /^whsec_/,
      description: 'Stripe webhook signing secret',
    },

    // Storage
    STORAGE_BUCKET: {
      required: false,
      requiredInProd: true,
      description: 'Cloud storage bucket name',
    },

    // Firebase (Push notifications)
    FIREBASE_PROJECT_ID: {
      required: false,
      requiredInProd: false,
      description: 'Firebase project ID',
    },

    // Sentry (Error tracking)
    SENTRY_DSN: {
      required: false,
      requiredInProd: true,
      pattern: /^https:\/\/.*@.*\.ingest\.sentry\.io/,
      description: 'Sentry DSN for error tracking',
    },
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.validateSecrets();
  }

  /**
   * Validate all secrets on startup
   */
  private validateSecrets(): void {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = environment === 'production';

    this.logger.log(`Validating secrets for environment: ${environment}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const valid: string[] = [];

    for (const [key, definition] of Object.entries(this.SECRET_DEFINITIONS)) {
      const value = this.configService.get<string>(key);
      const isRequired = definition.required || (isProduction && definition.requiredInProd);

      // Check if present
      if (!value) {
        if (isRequired) {
          errors.push(`Missing required secret: ${key} (${definition.description})`);
        } else {
          warnings.push(`Optional secret not set: ${key}`);
        }
        continue;
      }

      // Validate pattern
      if (definition.pattern && !definition.pattern.test(value)) {
        errors.push(`Invalid format for ${key}: does not match expected pattern`);
        continue;
      }

      // Validate minimum length
      if (definition.minLength && value.length < definition.minLength) {
        errors.push(`${key} is too short: minimum ${definition.minLength} characters required`);
        continue;
      }

      valid.push(key);
    }

    // Log results
    this.logger.log(`Valid secrets: ${valid.length}/${Object.keys(this.SECRET_DEFINITIONS).length}`);

    for (const warning of warnings) {
      this.logger.warn(warning);
    }

    // In production, fail if there are errors
    if (errors.length > 0) {
      for (const error of errors) {
        this.logger.error(error);
      }

      if (isProduction) {
        throw new Error(
          `Secret validation failed with ${errors.length} error(s). ` +
            `Fix missing/invalid secrets before deploying to production.`,
        );
      } else {
        this.logger.warn(
          `⚠️ ${errors.length} secret validation error(s) - ignored in ${environment} environment`,
        );
      }
    }

    this.logger.log('Secret validation completed');
  }

  /**
   * Check if a specific secret is configured
   */
  hasSecret(key: string): boolean {
    return !!this.configService.get<string>(key);
  }

  /**
   * Check if Stripe is properly configured
   */
  isStripeConfigured(): boolean {
    return this.hasSecret('STRIPE_SECRET_KEY') && this.hasSecret('STRIPE_WEBHOOK_SECRET');
  }

  /**
   * Check if Clerk is properly configured
   */
  isClerkConfigured(): boolean {
    return this.hasSecret('CLERK_SECRET_KEY') && this.hasSecret('CLERK_PUBLISHABLE_KEY');
  }

  /**
   * Check if push notifications are properly configured
   */
  isPushConfigured(): boolean {
    return this.hasSecret('FIREBASE_PROJECT_ID');
  }

  /**
   * Check if error tracking is configured
   */
  isSentryConfigured(): boolean {
    return this.hasSecret('SENTRY_DSN');
  }

  /**
   * Get secrets status for health check (no actual values!)
   */
  getSecretsStatus(): Record<string, { configured: boolean; required: boolean }> {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = environment === 'production';

    const result: Record<string, { configured: boolean; required: boolean }> = {};

    for (const [key, definition] of Object.entries(this.SECRET_DEFINITIONS)) {
      result[key] = {
        configured: this.hasSecret(key),
        required: definition.required || (isProduction && definition.requiredInProd),
      };
    }

    return result;
  }
}


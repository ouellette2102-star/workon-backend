import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { SecretsValidatorService } from './secrets-validator.service';

/**
 * Production Configuration Module
 * PR-11: Production Configuration
 *
 * Provides:
 * - Feature flags management
 * - Secrets validation on startup
 * - Safe defaults configuration
 *
 * This module is GLOBAL - services are available throughout the app.
 */
@Global()
@Module({
  providers: [FeatureFlagsService, SecretsValidatorService],
  exports: [FeatureFlagsService, SecretsValidatorService],
})
export class ProductionConfigModule {}


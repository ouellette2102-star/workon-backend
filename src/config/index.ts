/**
 * Config module exports
 * PR-11: Production Configuration
 */

export { FeatureFlagsService, FeatureFlags } from './feature-flags.service';
export type { FeatureFlag } from './feature-flags.service';

export { SecretsValidatorService } from './secrets-validator.service';

export {
  getSafeDefaults,
  getAppConfig,
  resetAppConfig,
} from './safe-defaults.config';

export type {
  AppConfiguration,
  SecurityConfig,
  RateLimitingConfig,
  PaymentsConfig,
  SessionConfig,
  LoggingConfig,
  FeaturesConfig,
} from './safe-defaults.config';


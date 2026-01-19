import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Feature Flags Service
 * PR-11: Production Configuration
 *
 * Centralized feature flag management with:
 * - Safe defaults (OFF by default)
 * - Environment-based overrides
 * - Runtime checking
 * - Audit logging
 *
 * PRINCIPLE: All new features are OFF by default.
 * Enable only when ready for production.
 */
@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flags: Map<string, boolean> = new Map();

  /**
   * Feature flag definitions with safe defaults
   * ALL flags default to FALSE (disabled)
   */
  private readonly FLAG_DEFINITIONS: Record<string, { default: boolean; description: string }> = {
    // Core Features (enabled by default in production)
    PAYMENTS_ENABLED: { default: true, description: 'Enable payment processing' },
    AUTH_ENABLED: { default: true, description: 'Enable authentication' },
    
    // PR-00: Trust Foundation
    AUDIT_LOGS_ENABLED: { default: true, description: 'Enable trust audit logging' },
    SUPPORT_TICKETS_ENABLED: { default: false, description: 'Enable in-app support tickets' },
    DISPUTE_SYSTEM_ENABLED: { default: false, description: 'Enable dispute management' },
    
    // PR-03: Stripe Security
    VELOCITY_CHECKS_ENABLED: { default: false, description: 'Enable payment velocity checks' },
    STRIPE_RADAR_ENABLED: { default: false, description: 'Enable Stripe Radar enrichment' },
    
    // PR-06: Identity Verification
    PHONE_VERIFICATION_REQUIRED: { default: false, description: 'Require phone verification' },
    ID_VERIFICATION_REQUIRED: { default: false, description: 'Require ID verification' },
    BANK_VERIFICATION_REQUIRED: { default: false, description: 'Require bank verification' },
    TRUST_TIERS_ENABLED: { default: false, description: 'Enable trust tier restrictions' },
    
    // PR-07: Notifications (dormant)
    PUSH_NOTIFICATIONS_ENABLED: { default: false, description: 'Enable push notifications' },
    EMAIL_NOTIFICATIONS_ENABLED: { default: false, description: 'Enable email notifications' },
    SMS_NOTIFICATIONS_ENABLED: { default: false, description: 'Enable SMS notifications' },
    
    // PR-10: Scheduling
    BOOKING_SYSTEM_ENABLED: { default: false, description: 'Enable booking system' },
    RECURRING_MISSIONS_ENABLED: { default: false, description: 'Enable recurring missions' },
    
    // Future Features
    ANALYTICS_TRACKING_ENABLED: { default: false, description: 'Enable analytics events' },
    OFFLINE_MODE_ENABLED: { default: false, description: 'Enable offline resilience' },
    ADVANCED_SEARCH_ENABLED: { default: false, description: 'Enable advanced search' },
    REFERRAL_SYSTEM_ENABLED: { default: false, description: 'Enable referral program' },
    
    // Debug/Dev Features (always off in production)
    DEBUG_MODE_ENABLED: { default: false, description: 'Enable debug mode' },
    MOCK_PAYMENTS_ENABLED: { default: false, description: 'Use mock payments (dev only)' },
    BYPASS_AUTH_ENABLED: { default: false, description: 'Bypass auth (dev only)' },
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.loadFlags();
    this.logFlagStatus();
  }

  /**
   * Load feature flags from environment
   * Format: FEATURE_<FLAG_NAME>=1 or FEATURE_<FLAG_NAME>=true
   */
  private loadFlags(): void {
    for (const [flag, definition] of Object.entries(this.FLAG_DEFINITIONS)) {
      const envKey = `FEATURE_${flag}`;
      const envValue = this.configService.get<string>(envKey);

      let value = definition.default;

      if (envValue !== undefined) {
        value = envValue === '1' || envValue.toLowerCase() === 'true';
      }

      this.flags.set(flag, value);
    }
  }

  /**
   * Log current flag status on startup
   */
  private logFlagStatus(): void {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    this.logger.log(`Feature flags loaded for environment: ${environment}`);

    const enabledFlags = Array.from(this.flags.entries())
      .filter(([, enabled]) => enabled)
      .map(([flag]) => flag);

    const disabledFlags = Array.from(this.flags.entries())
      .filter(([, enabled]) => !enabled)
      .map(([flag]) => flag);

    this.logger.log(`Enabled flags (${enabledFlags.length}): ${enabledFlags.join(', ') || 'none'}`);
    this.logger.debug(`Disabled flags (${disabledFlags.length}): ${disabledFlags.join(', ')}`);

    // Warn about dangerous flags in production
    if (environment === 'production') {
      const dangerousFlags = ['DEBUG_MODE_ENABLED', 'MOCK_PAYMENTS_ENABLED', 'BYPASS_AUTH_ENABLED'];
      for (const flag of dangerousFlags) {
        if (this.flags.get(flag)) {
          this.logger.error(`⚠️ DANGEROUS: ${flag} is enabled in production!`);
        }
      }
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flag: string): boolean {
    const value = this.flags.get(flag);
    if (value === undefined) {
      this.logger.warn(`Unknown feature flag: ${flag} - returning false`);
      return false;
    }
    return value;
  }

  /**
   * Get all flags and their status
   */
  getAllFlags(): Record<string, { enabled: boolean; description: string }> {
    const result: Record<string, { enabled: boolean; description: string }> = {};

    for (const [flag, definition] of Object.entries(this.FLAG_DEFINITIONS)) {
      result[flag] = {
        enabled: this.flags.get(flag) ?? definition.default,
        description: definition.description,
      };
    }

    return result;
  }

  /**
   * Get flags summary for health check
   */
  getFlagsSummary(): { total: number; enabled: number; disabled: number } {
    const total = this.flags.size;
    const enabled = Array.from(this.flags.values()).filter((v) => v).length;

    return {
      total,
      enabled,
      disabled: total - enabled,
    };
  }

  /**
   * Runtime flag check with fallback
   * Use this in guards and services
   */
  requireFeature(flag: string, errorMessage?: string): void {
    if (!this.isEnabled(flag)) {
      const msg = errorMessage ?? `Feature ${flag} is not enabled`;
      throw new Error(msg);
    }
  }

  /**
   * Decorator-friendly check
   */
  checkFeature(flag: string): boolean {
    return this.isEnabled(flag);
  }
}

/**
 * Feature flag names as constants for type safety
 */
export const FeatureFlags = {
  // Core
  PAYMENTS_ENABLED: 'PAYMENTS_ENABLED',
  AUTH_ENABLED: 'AUTH_ENABLED',

  // Trust
  AUDIT_LOGS_ENABLED: 'AUDIT_LOGS_ENABLED',
  SUPPORT_TICKETS_ENABLED: 'SUPPORT_TICKETS_ENABLED',
  DISPUTE_SYSTEM_ENABLED: 'DISPUTE_SYSTEM_ENABLED',

  // Stripe
  VELOCITY_CHECKS_ENABLED: 'VELOCITY_CHECKS_ENABLED',
  STRIPE_RADAR_ENABLED: 'STRIPE_RADAR_ENABLED',

  // Identity
  PHONE_VERIFICATION_REQUIRED: 'PHONE_VERIFICATION_REQUIRED',
  ID_VERIFICATION_REQUIRED: 'ID_VERIFICATION_REQUIRED',
  BANK_VERIFICATION_REQUIRED: 'BANK_VERIFICATION_REQUIRED',
  TRUST_TIERS_ENABLED: 'TRUST_TIERS_ENABLED',

  // Notifications
  PUSH_NOTIFICATIONS_ENABLED: 'PUSH_NOTIFICATIONS_ENABLED',
  EMAIL_NOTIFICATIONS_ENABLED: 'EMAIL_NOTIFICATIONS_ENABLED',
  SMS_NOTIFICATIONS_ENABLED: 'SMS_NOTIFICATIONS_ENABLED',

  // Scheduling
  BOOKING_SYSTEM_ENABLED: 'BOOKING_SYSTEM_ENABLED',
  RECURRING_MISSIONS_ENABLED: 'RECURRING_MISSIONS_ENABLED',

  // Future
  ANALYTICS_TRACKING_ENABLED: 'ANALYTICS_TRACKING_ENABLED',
  OFFLINE_MODE_ENABLED: 'OFFLINE_MODE_ENABLED',
  ADVANCED_SEARCH_ENABLED: 'ADVANCED_SEARCH_ENABLED',
  REFERRAL_SYSTEM_ENABLED: 'REFERRAL_SYSTEM_ENABLED',

  // Debug
  DEBUG_MODE_ENABLED: 'DEBUG_MODE_ENABLED',
  MOCK_PAYMENTS_ENABLED: 'MOCK_PAYMENTS_ENABLED',
  BYPASS_AUTH_ENABLED: 'BYPASS_AUTH_ENABLED',
} as const;

export type FeatureFlag = (typeof FeatureFlags)[keyof typeof FeatureFlags];


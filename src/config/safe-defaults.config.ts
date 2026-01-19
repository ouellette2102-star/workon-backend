/**
 * Safe Defaults Configuration
 * PR-11: Production Configuration
 *
 * Central configuration with security-conscious defaults.
 * All values prioritize security over convenience.
 *
 * PRINCIPLE: Default to the SAFEST option, enable permissive options explicitly.
 */

export interface AppConfiguration {
  // Environment
  readonly environment: 'development' | 'staging' | 'production';
  readonly isDevelopment: boolean;
  readonly isStaging: boolean;
  readonly isProduction: boolean;

  // Server
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: string[];

  // Security
  readonly security: SecurityConfig;

  // Rate Limiting
  readonly rateLimiting: RateLimitingConfig;

  // Payments
  readonly payments: PaymentsConfig;

  // Session
  readonly session: SessionConfig;

  // Logging
  readonly logging: LoggingConfig;

  // Features
  readonly features: FeaturesConfig;
}

export interface SecurityConfig {
  readonly jwtExpiresIn: string;
  readonly refreshTokenExpiresIn: string;
  readonly maxLoginAttempts: number;
  readonly lockoutDurationMinutes: number;
  readonly passwordMinLength: number;
  readonly requireStrongPassword: boolean;
  readonly csrfProtection: boolean;
  readonly helmet: boolean;
}

export interface RateLimitingConfig {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly authWindowMs: number;
  readonly authMaxRequests: number;
  readonly sensitiveWindowMs: number;
  readonly sensitiveMaxRequests: number;
}

export interface PaymentsConfig {
  readonly currency: string;
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly platformFeePercent: number;
  readonly refundWindowDays: number;
  readonly velocityMaxTransactionsPerHour: number;
  readonly velocityMaxTransactionsPerDay: number;
  readonly velocityMaxAmountPerDay: number;
}

export interface SessionConfig {
  readonly maxConcurrentSessions: number;
  readonly inactivityTimeoutMinutes: number;
  readonly absoluteTimeoutHours: number;
}

export interface LoggingConfig {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly sensitiveDataMasking: boolean;
  readonly requestLogging: boolean;
  readonly slowQueryThresholdMs: number;
}

export interface FeaturesConfig {
  readonly maintenanceMode: boolean;
  readonly registrationEnabled: boolean;
  readonly newFeaturesEnabled: boolean;
}

/**
 * Get configuration based on NODE_ENV
 */
export function getSafeDefaults(): AppConfiguration {
  const env = process.env.NODE_ENV || 'development';

  const baseConfig: AppConfiguration = {
    // Environment detection
    environment: env as 'development' | 'staging' | 'production',
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',

    // Server (safe defaults)
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),

    // Security (strict by default)
    security: {
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m', // Short-lived
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),
      passwordMinLength: 12, // NIST recommendation
      requireStrongPassword: true,
      csrfProtection: env === 'production',
      helmet: true,
    },

    // Rate limiting (enabled by default)
    rateLimiting: {
      enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      authWindowMs: 15 * 60 * 1000, // 15 minutes
      authMaxRequests: 10, // Strict for auth endpoints
      sensitiveWindowMs: 60 * 60 * 1000, // 1 hour
      sensitiveMaxRequests: 5, // Very strict for sensitive ops
    },

    // Payments (conservative limits)
    payments: {
      currency: process.env.STRIPE_CURRENCY || 'cad',
      minAmount: parseInt(process.env.MIN_PAYMENT_AMOUNT || '500', 10), // $5.00 CAD
      maxAmount: parseInt(process.env.MAX_PAYMENT_AMOUNT || '1000000', 10), // $10,000 CAD
      platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '10'),
      refundWindowDays: parseInt(process.env.REFUND_WINDOW_DAYS || '14', 10),
      velocityMaxTransactionsPerHour: 10,
      velocityMaxTransactionsPerDay: 50,
      velocityMaxAmountPerDay: 5000_00, // $5,000 in cents
    },

    // Session (secure defaults)
    session: {
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10),
      inactivityTimeoutMinutes: parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES || '30', 10),
      absoluteTimeoutHours: parseInt(process.env.ABSOLUTE_TIMEOUT_HOURS || '24', 10),
    },

    // Logging (production-safe defaults)
    logging: {
      level: (process.env.LOG_LEVEL as LoggingConfig['level']) || (env === 'production' ? 'info' : 'debug'),
      sensitiveDataMasking: true, // ALWAYS mask
      requestLogging: true,
      slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10),
    },

    // Features (conservative by default)
    features: {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
      newFeaturesEnabled: process.env.NEW_FEATURES_ENABLED === 'true', // OFF by default
    },
  };

  return baseConfig;
}

/**
 * Parse CORS origins from environment
 * Default: strict (only same-origin in production)
 */
function parseCorsOrigins(value: string | undefined): string[] {
  const env = process.env.NODE_ENV || 'development';

  if (!value) {
    // Default based on environment
    if (env === 'production') {
      // In production, require explicit CORS_ORIGINS
      return [];
    }
    // Development: allow localhost
    return ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'];
  }

  // Parse comma-separated origins
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Singleton instance
 */
let configInstance: AppConfiguration | null = null;

/**
 * Get or create configuration instance
 */
export function getAppConfig(): AppConfiguration {
  if (!configInstance) {
    configInstance = getSafeDefaults();
  }
  return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetAppConfig(): void {
  configInstance = null;
}


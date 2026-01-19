# Production Configuration Guide

**PR-11: Production Configuration**

## Overview

This document describes the production configuration system for WorkOn backend, including:

- Feature flags management
- Secrets validation
- Safe defaults configuration

## Architecture

```
src/config/
├── feature-flags.service.ts    # Centralized feature flag management
├── secrets-validator.service.ts # Startup secrets validation
├── safe-defaults.config.ts      # Security-conscious defaults
├── production-config.module.ts  # NestJS module (global)
├── env.validation.ts            # Environment validation (existing)
└── index.ts                     # Barrel exports
```

## Feature Flags

### Principle

**ALL features are OFF by default.** Enable only when ready for production.

### Usage

```typescript
import { FeatureFlagsService, FeatureFlags } from './config';

@Injectable()
export class MyService {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  async doSomething() {
    // Check if feature is enabled
    if (this.featureFlags.isEnabled(FeatureFlags.DISPUTE_SYSTEM_ENABLED)) {
      // Feature-specific logic
    }

    // Or use requireFeature to throw if disabled
    this.featureFlags.requireFeature(
      FeatureFlags.BOOKING_SYSTEM_ENABLED,
      'Booking system is not available'
    );
  }
}
```

### Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `PAYMENTS_ENABLED` | true | Enable payment processing |
| `AUTH_ENABLED` | true | Enable authentication |
| `AUDIT_LOGS_ENABLED` | true | Enable trust audit logging |
| `SUPPORT_TICKETS_ENABLED` | false | Enable in-app support tickets |
| `DISPUTE_SYSTEM_ENABLED` | false | Enable dispute management |
| `VELOCITY_CHECKS_ENABLED` | false | Enable payment velocity checks |
| `STRIPE_RADAR_ENABLED` | false | Enable Stripe Radar enrichment |
| `PHONE_VERIFICATION_REQUIRED` | false | Require phone verification |
| `ID_VERIFICATION_REQUIRED` | false | Require ID verification |
| `BANK_VERIFICATION_REQUIRED` | false | Require bank verification |
| `TRUST_TIERS_ENABLED` | false | Enable trust tier restrictions |
| `PUSH_NOTIFICATIONS_ENABLED` | false | Enable push notifications |
| `EMAIL_NOTIFICATIONS_ENABLED` | false | Enable email notifications |
| `SMS_NOTIFICATIONS_ENABLED` | false | Enable SMS notifications |
| `BOOKING_SYSTEM_ENABLED` | false | Enable booking system |
| `RECURRING_MISSIONS_ENABLED` | false | Enable recurring missions |
| `DEBUG_MODE_ENABLED` | false | ⚠️ DANGEROUS - Enable debug mode |
| `MOCK_PAYMENTS_ENABLED` | false | ⚠️ DANGEROUS - Use mock payments |
| `BYPASS_AUTH_ENABLED` | false | ⚠️ DANGEROUS - Bypass auth |

### Environment Variables

Enable a flag via environment variable:

```bash
FEATURE_DISPUTE_SYSTEM_ENABLED=1
# or
FEATURE_DISPUTE_SYSTEM_ENABLED=true
```

## Secrets Validation

### Principle

**Fail fast.** If required secrets are missing in production, the application will not start.

### Required Secrets (Production)

| Secret | Pattern/Constraint | Description |
|--------|-------------------|-------------|
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars | JWT signing secret |
| `CLERK_SECRET_KEY` | `sk_...` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | `pk_...` | Clerk publishable key |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook signing secret |
| `STORAGE_BUCKET` | Any string | Cloud storage bucket name |
| `SENTRY_DSN` | `https://...ingest.sentry.io` | Sentry error tracking |

### Validation Behavior

- **Development**: Warnings for missing secrets (app starts)
- **Production**: Errors for missing secrets (app fails to start)

## Safe Defaults

### Principle

**Default to the safest option.** Enable permissive options explicitly.

### Configuration Areas

#### Security

| Setting | Default | Description |
|---------|---------|-------------|
| `JWT_EXPIRES_IN` | 15m | Short-lived tokens |
| `REFRESH_TOKEN_EXPIRES_IN` | 7d | Refresh token lifetime |
| `MAX_LOGIN_ATTEMPTS` | 5 | Before lockout |
| `LOCKOUT_DURATION_MINUTES` | 30 | Account lockout time |
| `PASSWORD_MIN_LENGTH` | 12 | NIST recommendation |

#### Rate Limiting

| Setting | Default | Description |
|---------|---------|-------------|
| `RATE_LIMIT_ENABLED` | true | Always enabled |
| `RATE_LIMIT_MAX` | 100 | Requests per minute |
| `AUTH_MAX_REQUESTS` | 10 | Auth endpoint limit |
| `SENSITIVE_MAX_REQUESTS` | 5 | Sensitive ops limit |

#### Payments

| Setting | Default | Description |
|---------|---------|-------------|
| `MIN_PAYMENT_AMOUNT` | $5.00 | Minimum transaction |
| `MAX_PAYMENT_AMOUNT` | $10,000 | Maximum transaction |
| `VELOCITY_MAX_PER_HOUR` | 10 | Transactions per hour |
| `VELOCITY_MAX_PER_DAY` | 50 | Transactions per day |
| `VELOCITY_MAX_AMOUNT_PER_DAY` | $5,000 | Daily amount limit |

#### Sessions

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_CONCURRENT_SESSIONS` | 5 | Per user |
| `INACTIVITY_TIMEOUT_MINUTES` | 30 | Idle timeout |
| `ABSOLUTE_TIMEOUT_HOURS` | 24 | Maximum session length |

## Rollout Strategy

### Enabling New Features

1. **Development**: Test with `FEATURE_X_ENABLED=1` in `.env.local`
2. **Staging**: Enable in staging environment
3. **Production**: Enable gradually with monitoring
4. **Rollback**: Set back to `0` if issues arise

### Checklist Before Enabling a Feature

- [ ] All related tests pass
- [ ] Feature tested in staging
- [ ] Monitoring/alerting in place
- [ ] Rollback plan documented
- [ ] Team notified

## Monitoring

### Feature Flags Status

The `FeatureFlagsService` provides a summary for health checks:

```typescript
const summary = featureFlags.getFlagsSummary();
// { total: 20, enabled: 5, disabled: 15 }
```

### Dangerous Flags Warning

On startup, if dangerous flags are enabled in production:

```
⚠️ DANGEROUS: DEBUG_MODE_ENABLED is enabled in production!
```

## Testing

### Mocking Feature Flags

```typescript
const mockFeatureFlags = {
  isEnabled: jest.fn().mockReturnValue(true),
  requireFeature: jest.fn(),
};

// In test module
providers: [
  { provide: FeatureFlagsService, useValue: mockFeatureFlags },
],
```

### Testing Safe Defaults

```typescript
import { resetAppConfig, getAppConfig } from './config';

beforeEach(() => {
  resetAppConfig(); // Reset singleton
});
```


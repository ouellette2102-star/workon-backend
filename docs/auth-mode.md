# Authentication Mode Documentation

> **Current Mode: Local JWT** (Clerk disabled)

## Overview

WorkOn backend supports two authentication modes:

| Mode | Status | Use Case |
|------|--------|----------|
| **Local JWT** | ✅ ACTIVE | Production (email/password) |
| **Clerk** | ❌ DISABLED | External SSO (commented out) |

## Active Authentication Flow

```
Frontend                          Backend
   │                                 │
   ├─── POST /auth/register ────────►│ Create user + return JWT
   │                                 │
   ├─── POST /auth/login ───────────►│ Verify credentials + return JWT
   │                                 │
   ├─── GET /api/* (Bearer token) ──►│ JwtAuthGuard validates token
   │                                 │
```

## Files Reference

### Guards & Strategies (Active)

| File | Purpose | Status |
|------|---------|--------|
| `src/auth/guards/jwt-auth.guard.ts` | Validates JWT on protected routes | ✅ Active |
| `src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy (default) | ✅ Active |
| `src/auth/strategies/jwt-local.strategy.ts` | Local auth JWT validation | ✅ Active |
| `src/auth/local-auth.service.ts` | Email/password authentication | ✅ Active |

### Guards & Strategies (Disabled)

| File | Purpose | Status |
|------|---------|--------|
| `src/auth/clerk-auth.service.ts` | Clerk token verification | ❌ Disabled (exists but not imported) |
| `src/auth/strategies/local.strategy.ts` | Passport local strategy | ❌ Disabled (commented out) |

### Module Configuration

```typescript
// src/auth/auth.module.ts
providers: [
  JwtStrategy,
  JwtAuthGuard,
  LocalAuthService,      // ✅ Active
  JwtLocalStrategy,      // ✅ Active
  // ClerkAuthService,   // ❌ Commented out
  // LocalStrategy,      // ❌ Commented out
],
```

## Endpoints

### Currently Implemented

| Endpoint | Method | Auth | Handler |
|----------|--------|------|---------|
| `/api/v1/auth/register` | POST | Public | `LocalAuthService.register()` |
| `/api/v1/auth/login` | POST | Public | `LocalAuthService.login()` |
| `/api/v1/auth/me` | GET | JWT | `AuthController.getMe()` |

### Not Yet Implemented (TODO)

| Endpoint | Method | Purpose | Owner |
|----------|--------|---------|-------|
| `/api/v1/auth/refresh` | POST | Token refresh | Backend (LocalAuthService) |
| `/api/v1/auth/forgot-password` | POST | Request reset | Backend (LocalAuthService) |
| `/api/v1/auth/reset-password` | POST | Reset password | Backend (LocalAuthService) |

> **Note**: These endpoints are handled by the backend, not Clerk. The `JwtRefreshStrategy` exists but the endpoint is not yet wired.

## Token Structure

Tokens issued by `LocalAuthService` contain:

```json
{
  "sub": "user_uuid",
  "role": "WORKER|EMPLOYER",
  "provider": "local",
  "iat": 1234567890,
  "exp": 1234567890
}
```

The `provider: "local"` field distinguishes local tokens from potential Clerk tokens.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Secret for signing JWTs |
| `JWT_REFRESH_SECRET` | ✅ Yes | Secret for refresh tokens |
| `JWT_EXPIRATION` | No | Token TTL (default: `7d`) |
| `CLERK_SECRET_KEY` | No | Only if Clerk is re-enabled |

## Re-enabling Clerk (If Needed)

To switch back to Clerk authentication:

1. Uncomment `ClerkAuthService` in `src/auth/auth.module.ts`
2. Add `CLERK_SECRET_KEY` and `CLERK_ISSUER` to environment
3. Update `JwtAuthGuard` to check Clerk tokens
4. Update frontend to use Clerk SDK

---

*Last updated: December 2024*


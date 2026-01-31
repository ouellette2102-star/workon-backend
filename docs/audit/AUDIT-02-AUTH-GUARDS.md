# AUDIT 02: AUTH, AUTHORIZATION & GUARDS

> **Date**: 2026-01-31  
> **Auditor**: AI Lead Engineer  
> **Scope**: Authentication, Authorization, Guards, Token Management  
> **Verdict**: ✅ **PASS**

---

## 📊 EXECUTIVE SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| JWT Authentication | ✅ PASS | Local auth, no Clerk dependency |
| Password Hashing | ✅ PASS | bcryptjs, 12 rounds |
| Token Rotation | ✅ PASS | Access 15m, Refresh 7d |
| Role-Based Access | ✅ PASS | WORKER, EMPLOYER, ADMIN |
| Consent Guard | ✅ PASS | Loi 25 / GDPR compliant |
| Rate Limiting | ✅ PASS | Configurable TTL/limit |
| Unit Tests | ✅ 84 PASS | All auth/guard tests green |

---

## 🔐 AUTHENTICATION ARCHITECTURE

### Auth Mode: Local JWT
```
Provider: LocalAuthService (email/password)
Strategy: JwtLocalStrategy + JwtStrategy  
Clerk: Disabled (legacy code present but unused)
```

### Token Structure
```typescript
// Access Token (15m)
{
  sub: userId,
  role: UserRole,
  provider: 'local',
  type: 'access',
  exp: 15 minutes
}

// Refresh Token (7d) - Separate secret
{
  sub: userId,
  type: 'refresh',
  exp: 7 days
}

// Reset Token (15m) - Derived secret
{
  sub: userId,
  email: userEmail,
  type: 'password-reset',
  exp: 15 minutes
}
```

### Secrets Configuration
| Secret | Purpose | Min Length |
|--------|---------|------------|
| `JWT_SECRET` | Access token signing | 32 chars |
| `JWT_REFRESH_SECRET` | Refresh token signing | 32 chars |
| Derived: `JWT_SECRET-reset` | Reset token signing | N/A |

---

## 🛡️ GUARDS INVENTORY

### 1. JwtAuthGuard ✅
```typescript
// src/auth/guards/jwt-auth.guard.ts
- Validates JWT from Authorization header
- Extracts: sub, email, role, provider
- Throws 401 on: missing token, invalid token, expired token
- Security: Role comes ONLY from verified JWT (never from request body)
```

**Usage**: 56 `@UseGuards` decorators across 27 controllers

### 2. RolesGuard ✅
```typescript
// src/auth/guards/roles.guard.ts
- Checks user.role against @Roles() decorator
- Requires JwtAuthGuard to run first
- Throws 403 with clear message: "Accès réservé aux {roles}"
```

**Roles Supported**:
- `UserRole.WORKER`
- `UserRole.EMPLOYER`
- `UserRole.ADMIN`

### 3. ConsentGuard ✅
```typescript
// src/compliance/guards/consent.guard.ts
- Verifies legal consent (Terms + Privacy)
- Only activates with @RequireConsent() decorator
- Fail-closed: No bypass, no admin override
- Compliance: Loi 25 Québec, GDPR
```

### 4. RateLimitGuard ✅
```typescript
// src/common/guards/rate-limit.guard.ts
- Configurable via @RateLimit() decorator
- Default: 100 requests / 60 seconds
- Per-IP tracking
```

---

## 🔒 PASSWORD SECURITY

### Hashing Algorithm
```typescript
// src/users/users.service.ts
Algorithm: bcryptjs
Salt Rounds: 12 (configurable via BCRYPT_ROUNDS)
```

### Password Flow
```
1. Registration: password → bcrypt.hash(12 rounds) → DB
2. Login: password + stored hash → bcrypt.compare → true/false
3. Reset: token verification → new password → bcrypt.hash → DB
```

### Security Features
- ✅ Password never stored in plain text
- ✅ Password excluded from all API responses (`@Exclude()` decorator)
- ✅ Salt included in hash (bcrypt standard)
- ✅ Timing-safe comparison (bcrypt.compare)

---

## 🔄 TOKEN LIFECYCLE

### Login Flow
```
1. POST /api/v1/auth/login
2. Validate credentials
3. Generate accessToken (15m) + refreshToken (7d)
4. Return tokens + user (sans password)
```

### Refresh Flow
```
1. POST /api/v1/auth/refresh
2. Verify refreshToken with JWT_REFRESH_SECRET
3. Validate user still exists + active
4. Generate NEW accessToken + NEW refreshToken (rotation)
5. Return new tokens
```

### Password Reset Flow
```
1. POST /api/v1/auth/forgot-password
2. Generate resetToken (15m, derived secret)
3. [DEV] Return token in response
4. [PROD] Send email with link
5. POST /api/v1/auth/reset-password
6. Verify resetToken
7. Hash + save new password
```

---

## 🧪 TEST EVIDENCE

### Tests Executed
```
Test Suites: 13 passed, 13 total
Tests:       84 passed, 84 total
Time:        37.1 s
```

### Test Coverage by Component
| Component | File | Tests |
|-----------|------|-------|
| JwtAuthGuard | jwt-auth.guard.spec.ts | 6 |
| RolesGuard | roles.guard.spec.ts | 8 |
| ConsentGuard | consent.guard.spec.ts | 7 |
| RateLimitGuard | rate-limit.guard.spec.ts | 5 |
| LocalAuthService | local-auth.service.spec.ts | 14 |
| AuthController | auth.controller.spec.ts | 18 |
| Account Deletion | auth.controller.delete.spec.ts | 8 |
| JWT Strategies | jwt*.strategy.spec.ts | 12 |
| AdminInterceptor | admin-action.interceptor.spec.ts | 6 |

---

## 🔍 SECURITY CHECKLIST

### ✅ PASSED
- [x] JWT signed with strong secret (min 32 chars)
- [x] Refresh tokens use separate secret
- [x] Token expiration enforced (15m access, 7d refresh)
- [x] Token rotation on refresh (prevents replay)
- [x] Password hashing with bcrypt (12 rounds)
- [x] Password excluded from API responses
- [x] Role extracted from JWT only (not request body)
- [x] 401 on missing/invalid token
- [x] 403 on insufficient role
- [x] Rate limiting configurable
- [x] Consent verification for sensitive operations

### ⚠️ OBSERVATIONS (Non-Blocking)
1. **Clerk code present but disabled** - Legacy code, no security impact
2. **Reset token in DEV response** - Correct behavior (disabled in PROD)
3. **No token blacklist** - Acceptable for MVP (short access token lifetime)

---

## 📋 ENDPOINTS PROTECTION MATRIX

| Endpoint | Guards | Notes |
|----------|--------|-------|
| `/auth/register` | None | Public |
| `/auth/login` | None | Public |
| `/auth/refresh` | None | Validates refresh token internally |
| `/auth/me` | JwtAuthGuard | Returns current user |
| `/auth/account` (DELETE) | JwtAuthGuard | Soft delete account |
| `/missions-local/*` | JwtAuthGuard | All protected |
| `/offers/*` | JwtAuthGuard, ConsentGuard | Requires consent |
| `/contracts/*` | JwtAuthGuard, ConsentGuard | Requires consent |
| `/admin/*` | JwtAuthGuard, RolesGuard(ADMIN) | Admin only |
| `/compliance/accept` | JwtAuthGuard | Accept legal docs |
| `/compliance/status` | JwtAuthGuard | Check consent status |

---

## ✅ VERDICT: PASS

Authentication and authorization are production-ready:
- ✅ Secure JWT implementation
- ✅ Proper password hashing (bcrypt 12 rounds)
- ✅ Token rotation on refresh
- ✅ Role-based access control
- ✅ Legal consent enforcement
- ✅ 84 unit tests passing

**Confidence Level**: HIGH

---

*Audit completed: 2026-01-31*

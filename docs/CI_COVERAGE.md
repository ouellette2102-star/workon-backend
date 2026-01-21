# CI Coverage Strategy

> **Version:** 1.0.0  
> **Date:** 2026-01-21  
> **Status:** Active

---

## 📊 Current Baseline

| Metric | Current | Threshold | Target |
|--------|---------|-----------|--------|
| **Statements** | 26.19% | 26% | 60% |
| **Branches** | 23.34% | 23% | 60% |
| **Functions** | 26.88% | 26% | 60% |
| **Lines** | 26.07% | 26% | 60% |

**Baseline Date:** 2026-01-21  
**Tests:** 374 passing (24 spec files)

---

## 🎯 Coverage Trajectory

### Phase 1: Baseline (Current)
- **Thresholds:** 26% / 23% / 26% / 26% (statements/branches/functions/lines)
- **Goal:** CI green, no regressions
- **Status:** ✅ Active

### Phase 2: Critical Paths (+15%)
- **Target:** 40% global
- **Modules:**
  - `auth/` — JWT, guards, login/logout
  - `missions/` — CRUD, status transitions
  - `stripe/` — Payment intents, webhooks (mocked)
- **ETA:** +3-5 PRs

### Phase 3: Store Ready (+20%)
- **Target:** 60% global
- **Modules:**
  - `users/` — Profile, settings
  - `notifications/` — Queue, delivery (mocked providers)
  - `contracts/` — Compliance flows
  - `admin/` — Admin operations
- **ETA:** +5-7 PRs

---

## 📋 Priority Modules for Testing

| Priority | Module | Current Coverage | Impact |
|----------|--------|------------------|--------|
| 🔴 P0 | `auth/` | ~35% | Security critical |
| 🔴 P0 | `missions/` | ~15% | Core business |
| 🟠 P1 | `stripe/` | 0% | Payment flows |
| 🟠 P1 | `users/` | ~40% | User management |
| 🟡 P2 | `notifications/` | ~45% | Async delivery |
| 🟡 P2 | `contracts/` | ~20% | Compliance |

---

## 🛡️ Testing Rules

### DO ✅
- Test **behavior**, not implementation
- Mock external services (SendGrid, Stripe, FCM)
- Test error paths and edge cases
- Use realistic test data

### DON'T ❌
- Write tests just to increase %
- Call real external APIs in tests
- Skip tests to make CI green
- Test private methods directly

---

## 🔧 Configuration

### Jest Thresholds (`package.json`)

```json
"coverageThreshold": {
  "global": {
    "lines": 26,
    "statements": 26,
    "functions": 26,
    "branches": 23
  }
}
```

### Run Coverage Locally

```bash
# Full coverage report
npm run test:cov

# Coverage for specific module
npm run test:cov -- --testPathPattern="auth"
```

### CI Behavior

- Coverage runs on every PR
- Threshold violation = CI failure
- Coverage report uploaded to Codecov (if configured)

---

## 📈 Increasing Thresholds

When adding tests, update thresholds in `package.json`:

1. Run `npm run test:cov`
2. Note new coverage %
3. Update thresholds to (new value - 2%)
4. Commit with PR

**Never lower thresholds** — only maintain or increase.

---

## 📚 References

- [Jest Coverage Configuration](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [WorkOn DoD](../DoD.md)


## Summary
Adds final documentation and tooling for the backend release.

## Files
- docs/API_CONTRACT_FRONTEND.md (v1.1) - full API contract with Definition of Done section
- scripts/smoke-probe.mjs - E2E smoke tests (28/28 PASS on Railway prod)
- scripts/smoke-e2e.ps1 - PowerShell version for Windows
- scripts/diag-earnings.mjs - diagnostic script used to identify earnings 500 root cause

## Backend declared TERMINEE
- 28/28 smoke tests PASS on Railway prod
- earnings/summary HTTP 200 (was 500, fixed by PR #131)
- All critical E2E flows F1-F6 validated with proof

## How to run smoke tests
```
node scripts/smoke-probe.mjs
```

## Checklist
- API contract covers all endpoints needed by frontend
- Definition of Done documented with pass/fail criteria
- Smoke script is idempotent (creates test users, no cleanup needed)
- Residual risks documented (R-1: Railway deploy issue, R-2: MissionsMapModule missing)

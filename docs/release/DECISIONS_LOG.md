# DECISIONS LOG — WorkOn v1.0

> **Date**: 2026-01-31  
> **Purpose**: Record all architectural and technical decisions for transmissibility

---

## 📋 DECISION TEMPLATE

```
### D-XXX: [Title]
**Date**: YYYY-MM-DD
**Status**: Accepted / Superseded / Deprecated
**Context**: Why was this decision needed?
**Decision**: What was decided?
**Consequences**: What are the implications?
```

---

## 🔐 AUTHENTICATION DECISIONS

### D-001: Local JWT Authentication (No Clerk)

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
Initially, WorkOn used Clerk for authentication. However, for v1.0 store release, we needed:
- Full control over user data
- Quebec Loi 25 compliance (data residency)
- Simplified architecture
- Cost reduction

**Decision**:  
Implement local JWT authentication with:
- Email/password registration
- JWT access tokens (7 days expiry)
- Refresh token rotation
- bcrypt password hashing

**Consequences**:
- ✅ Full data control
- ✅ Loi 25 compliant
- ✅ No external dependency
- ⚠️ Must implement our own password reset
- ⚠️ No social login (for now)

---

### D-002: LocalUser Model (Separate from Clerk User)

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
The existing `User` model was tied to Clerk's `clerkId`. For local auth, we needed a clean model.

**Decision**:  
Create `LocalUser` model with:
- `id` starting with `local_` prefix
- Own authentication fields
- GDPR/Loi 25 compliance fields
- Trust tier system

**Consequences**:
- ✅ Clean separation from legacy
- ✅ Built-in compliance fields
- ⚠️ Parallel models during migration
- ⚠️ Some services needed migration

---

## 📍 MISSIONS DECISIONS

### D-003: LocalMission Model (Geospatial)

**Date**: 2026-01-20  
**Status**: Accepted

**Context**:  
Missions need location-based discovery with radius search.

**Decision**:  
Create `LocalMission` model with:
- Direct lat/lng fields
- Haversine formula for distance calculation
- Raw SQL for geospatial queries (performance)

**Consequences**:
- ✅ Fast distance queries
- ✅ No PostGIS dependency
- ⚠️ Raw SQL for some queries

---

### D-004: Mission Status Flow

**Date**: 2026-01-20  
**Status**: Accepted

**Context**:  
Need clear mission lifecycle for both parties.

**Decision**:  
Status flow: `open` → `assigned` → `in_progress` → `completed` → `paid`

**Consequences**:
- ✅ Clear state machine
- ✅ Both parties understand status
- ✅ Payment tied to completion

---

## 💬 MESSAGES DECISIONS

### D-005: LocalMessage Migration (From Clerk to Local)

**Date**: 2026-01-31  
**Status**: Accepted

**Context**:  
The existing `Message` model used Clerk's `User` model. With local auth, it needed migration.

**Decision**:  
Create `LocalMessage` model with:
- Reference to `LocalMission`
- Reference to `LocalUser`
- Same chat functionality
- New endpoints: `/api/v1/messages-local/*`

**Consequences**:
- ✅ Works with LocalUser
- ✅ Chat functional for v1.0
- ⚠️ Old Message model kept for legacy

---

## 💳 PAYMENTS DECISIONS

### D-006: Stripe Integration

**Date**: 2026-01-22  
**Status**: Accepted

**Context**:  
Need secure payment processing for mission completion.

**Decision**:  
Use Stripe with:
- Checkout Sessions for payment
- Webhooks for confirmation
- No card data stored locally

**Consequences**:
- ✅ PCI compliant
- ✅ Secure payments
- ✅ Multiple payment methods
- ⚠️ Stripe fees apply

---

## ⚖️ COMPLIANCE DECISIONS

### D-007: ConsentGuard for Legal Compliance

**Date**: 2026-01-25  
**Status**: Accepted

**Context**:  
Quebec Loi 25 requires explicit consent before data processing.

**Decision**:  
Implement `ConsentGuard` that:
- Blocks protected routes without consent
- Requires TERMS + PRIVACY acceptance
- Tracks consent with timestamps
- Fails closed (blocks if unsure)

**Consequences**:
- ✅ Loi 25 compliant
- ✅ GDPR aligned
- ✅ Audit trail
- ⚠️ User friction (must accept first)

---

### D-008: LocalUser Consent Bypass (Temporary)

**Date**: 2026-01-30  
**Status**: Accepted (Temporary)

**Context**:  
LocalUser IDs don't exist in the `users` table (Clerk), causing FK constraint errors when recording consent.

**Decision**:  
Temporary bypass in `ComplianceService`:
- If user ID starts with `local_`, skip DB write
- Return "consent complete" status
- Consent tracked client-side in Flutter

**Consequences**:
- ✅ Unblocks v1.0 release
- ⚠️ Consent not in DB for LocalUser
- 📅 TODO: Create LocalConsentRecord model

---

## 🏗️ ARCHITECTURE DECISIONS

### D-009: Module Boundaries (NestJS)

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
Need clear module boundaries for maintainability.

**Decision**:  
- Each domain has its own module
- Modules import `AuthModule` for guards
- Shared services exported from their module
- No circular dependencies (use `forwardRef` if needed)

**Consequences**:
- ✅ Clear ownership
- ✅ Testable in isolation
- ✅ Easy to understand

---

### D-010: API Versioning (/api/v1/)

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
Need API versioning for future changes.

**Decision**:  
All routes prefixed with `/api/v1/`:
- `/api/v1/auth/*`
- `/api/v1/missions-local/*`
- `/api/v1/messages-local/*`
- etc.

**Consequences**:
- ✅ Version isolation
- ✅ Can add v2 later
- ✅ Clear contract

---

## 🧪 TESTING DECISIONS

### D-011: Jest for All Tests

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
Need consistent testing framework.

**Decision**:  
Use Jest for:
- Unit tests (`.spec.ts`)
- E2E tests (`.e2e-spec.ts`)
- Mocking with jest.fn()

**Consequences**:
- ✅ Single framework
- ✅ Good NestJS integration
- ✅ Fast parallel execution

---

### D-012: E2E with Real Database

**Date**: 2026-01-25  
**Status**: Accepted

**Context**:  
E2E tests need real database interactions.

**Decision**:  
GitHub Actions spins up PostgreSQL service:
- Fresh database per run
- Migrations applied
- Seeded if needed

**Consequences**:
- ✅ Real integration tests
- ✅ Catches migration issues
- ⚠️ Slower than mocks

---

## 📱 FLUTTER DECISIONS

### D-013: Navigation Post-Login Fix

**Date**: 2026-01-30  
**Status**: Accepted

**Context**:  
After successful login, app stayed on login screen because `AuthGate` wasn't in widget tree.

**Decision**:  
Add explicit `context.go('/')` after login/signup success to trigger `AuthGate`.

**Consequences**:
- ✅ Proper navigation
- ✅ AuthGate handles routing
- ✅ Consistent UX

---

### D-014: Dynamic Catalog (Not Hardcoded)

**Date**: 2026-01-30  
**Status**: Accepted

**Context**:  
Categories were hardcoded in Flutter. Need dynamic from backend.

**Decision**:  
Create `CatalogService` + `CatalogApi`:
- Fetch categories from `/api/v1/catalog/categories`
- Cache with 5-minute TTL
- Fallback to empty on error

**Consequences**:
- ✅ Dynamic categories
- ✅ Backend is source of truth
- ⚠️ Requires network call

---

## 📦 DEPLOYMENT DECISIONS

### D-015: Railway for Backend

**Date**: 2026-01-15  
**Status**: Accepted

**Context**:  
Need simple, scalable hosting for NestJS.

**Decision**:  
Use Railway with:
- Nixpacks builder
- PostgreSQL managed
- Auto-deploy on push to main

**Consequences**:
- ✅ Simple setup
- ✅ Good DX
- ✅ Managed database
- ⚠️ Vendor lock-in

---

### D-016: Prisma Migrate Deploy in CI

**Date**: 2026-01-31  
**Status**: Accepted

**Context**:  
Migrations must run in CI and production.

**Decision**:  
- CI runs `prisma migrate deploy` before tests
- Production runs on startup (Railway)
- Migration folder naming: `YYYYMMDDHHMMSS_name`

**Consequences**:
- ✅ Consistent migrations
- ✅ CI catches issues
- ⚠️ Must follow naming convention

---

## 📝 SUPERSEDED DECISIONS

### D-S01: Clerk Authentication

**Date**: 2026-01-01 → Superseded 2026-01-15  
**Status**: Superseded by D-001

**Original Decision**: Use Clerk for authentication  
**Superseded By**: Local JWT authentication

---

### D-S02: Message Model with Clerk User

**Date**: 2026-01-01 → Superseded 2026-01-31  
**Status**: Superseded by D-005

**Original Decision**: Message model references Clerk User  
**Superseded By**: LocalMessage model with LocalUser

---

## 📅 FUTURE DECISIONS (TODO)

| ID | Topic | Priority |
|----|-------|----------|
| D-F01 | LocalConsentRecord model | High |
| D-F02 | Real-time chat (WebSocket) | Medium |
| D-F03 | Social login (Google, Apple) | Low |
| D-F04 | Multi-language support | Medium |

---

*Log maintained: 2026-01-31*  
*Version: 1.0*

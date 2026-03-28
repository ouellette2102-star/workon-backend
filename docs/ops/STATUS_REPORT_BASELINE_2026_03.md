# WorkOn System Status Report -- Baseline
> Date: 2026-03-27
> Type: Comprehensive system baseline
> Purpose: Establish state-of-the-world for all WorkOn components

---

## 1. Executive Summary

WorkOn is a global work infrastructure platform currently in Quebec MVP phase. The backend is live on Railway, integrated with GoHighLevel (CRM), N8N (automation), and Stripe (payments). The frontend is transitioning from FlutterFlow to Next.js for landing pages with a native Flutter mobile app. The system has 40 Prisma models, 24+ NestJS modules, and 8 public API endpoints. Core infrastructure is operational; key gaps are Stripe Connect Express activation, test coverage at 26%, and Next.js landing pages not yet deployed.

---

## 2. Backend Status (NestJS + Prisma + PostgreSQL)

### Deployment
| Item | Status | Details |
|------|--------|---------|
| Runtime | LIVE | Railway project `modest-abundance` |
| URL | ACTIVE | `https://workon-backend-production-8908.up.railway.app` |
| Framework | NestJS | TypeScript, Prisma ORM |
| Database | PostgreSQL | Railway-hosted, auto-backup |
| Latest PR | #141 MERGED | 2026-03-27 -- public profile fields migration |
| Health endpoint | `/hz` | Active, monitored |

### Module Inventory (39 modules)
| Category | Modules | Status |
|----------|---------|--------|
| Core | app, prisma, config, health, logger | ACTIVE |
| Auth | auth (JWT/local), identity | ACTIVE |
| Users | users, profile | ACTIVE |
| Missions | missions, missions-local, missions-map, mission-events, mission-photos, mission-time-logs | ACTIVE |
| Payments | payments, payments-local, stripe, earnings | ACTIVE |
| Communication | messages, messages-local, notifications, push | ACTIVE |
| Business | contracts, offers, reviews, catalog, scheduling | ACTIVE |
| Operations | admin, compliance, support, media, storage, devices | ACTIVE |
| Infrastructure | metrics, security, audit, alert, notifications-worker | ACTIVE |

### Database Schema
- **Models**: 40 Prisma models
- **Latest migration**: `20260327000000_add_public_profile_fields` (APPLIED)
- **Key tables**: local_users, missions, payments, contracts, reviews, messages, devices, notifications
- **New columns** (PR #141): slug, bio, ratingAvg, ratingCount, gclid, fbclid, ttclid, utmSource, utmMedium, utmCampaign

### API Endpoints

**Public (no auth)**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/public/stats` | GET | Platform statistics |
| `/api/v1/public/workers/featured` | GET | Featured workers list |
| `/api/v1/public/workers/:slug` | GET | Worker public profile |
| `/api/v1/public/reviews/featured` | GET | Featured reviews |
| `/api/v1/public/missions` | GET | Public missions feed |
| `/api/v1/public/sectors/stats` | GET | Sector statistics |
| `/api/v1/reviews/public` | GET | Public reviews |
| `/api/v1/reviews/featured` | GET | Featured reviews |

**Webhook (no auth, signature-verified)**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/missions/webhook-ghl` | POST | GHL mission creation |
| `/api/v1/pros/ghl-signup` | POST | GHL worker registration |
| `/api/v1/webhooks/stripe` | POST | Stripe payment events |

**Authenticated (JWT required)** -- Full CRUD on missions, users, payments, messages, contracts, reviews, etc.

---

## 3. Frontend Status

### Next.js (Landing Pages)
| Item | Status | Details |
|------|--------|---------|
| Repository | EXISTS | `../workonapp/public` (or `../workonapp`) |
| Deployment | NOT YET | Planned for Vercel |
| Pages planned | 5 | Homepage, /pros, /employeurs, /p/[slug], /missions |
| Data source | READY | Backend public API endpoints active |
| GTM / Analytics | NOT CONFIGURED | GA4, Meta Pixel, TikTok Pixel planned |

### Flutter Mobile App
| Item | Status | Details |
|------|--------|---------|
| Original | FlutterFlow | Being converted to native Flutter |
| Conversion plan | DOCUMENTED | See WORKON_CONVERSION_PLAN_COMPLETE.md |
| Store readiness | IN PROGRESS | Checklist documented |

---

## 4. GoHighLevel (GHL) Status

| Item | Status | Details |
|------|--------|---------|
| Sub-account | ACTIVE | WorkOn (ID: oECRc7HEiImpIIDLLQB0) |
| Created | 2026-03-15 | |
| Phone services | CONFIGURED | SMS + voice active |
| Pipeline: Worker Recruitment | CONFIGURED | 6 stages |
| Pipeline: Missions | CONFIGURED | 9 stages |
| Pipeline: Client Acquisition | CONFIGURED | 5 stages |
| Forms: Worker signup | CONFIGURED | Feeds /api/v1/pros/ghl-signup |
| Forms: Client mission | CONFIGURED | Feeds /api/v1/missions/webhook-ghl |
| Automations | 6 ACTIVE | New worker, new mission, worker accepts, payment received, post-mission follow-up, client nurture |
| Contacts | OPERATIONAL | Worker + Client tags |

---

## 5. N8N Status

| Item | Status | Details |
|------|--------|---------|
| Instance | LIVE | `https://n8n-production-9b4ce.up.railway.app` |
| Railway project | `comfortable-benevolence` | |
| Active workflows | 2 | |
| Workflow 1 | GHL Mission -> Backend | Routes mission requests |
| Workflow 2 | GHL Pro Signup -> Backend | Routes worker registrations |
| Planned workflows | Stripe -> Meta CAPI | Not yet configured |

---

## 6. Stripe Status

| Item | Status | Details |
|------|--------|---------|
| Account | ACTIVE | `acct_1SWIWDCm3RnXcbKH` |
| Mode | LIVE | Production keys configured |
| Products | 5 CREATED | Mission-related products |
| Webhook | REGISTERED | `we_1T7NJUCm3RnXcbKHsShElkth` |
| Webhook URL | ACTIVE | `/api/v1/webhooks/stripe` |
| Events monitored | 8 | payment_intent.succeeded/failed/canceled, checkout.session.completed, account.updated, customer.subscription.created/updated/deleted |
| Connect Express | NOT ENABLED | **BLOCKER** -- requires manual activation in Stripe Dashboard |
| Commission model | 15% | Platform fee on all transactions |

### Stripe Blocker
Stripe Connect Express must be manually activated at `https://dashboard.stripe.com/settings/connect`. This blocks worker payouts (the 85% disbursement after commission). Until activated, payments can be collected but not split.

---

## 7. Test Coverage

| Metric | Value | Threshold | Target |
|--------|-------|-----------|--------|
| Statements | 26.19% | 26% | 60% |
| Branches | 23.34% | 23% | 60% |
| Functions | 26.88% | 26% | 60% |
| Lines | 26.07% | 26% | 60% |
| Test count | 374 | -- | -- |
| Spec files | 24 | -- | -- |
| CI status | GREEN | -- | -- |

### Coverage Notes
- Baseline established 2026-01-21
- CI configured to prevent regressions below thresholds
- Priority modules for next coverage push: auth, missions, stripe (payment flows)

---

## 8. CI/CD Pipeline

| Item | Status | Details |
|------|--------|---------|
| Repository | GitHub | `ouellette2102-star/workon-backend` |
| Main branch | `main` | Protected |
| CI | GitHub Actions | Lint + test on PR |
| CD | Railway auto-deploy | On merge to main |
| PR process | Standard | Branch -> PR -> Review -> Merge |
| Latest merge | PR #141 | 2026-03-27 |
| ESLint | CONFIGURED | Warning budget tracked |
| Prisma migrations | AUTOMATED | `prisma migrate deploy` on build |

---

## 9. Security Status

| Control | Status | Details |
|---------|--------|---------|
| Authentication | JWT (HS256) | Access + refresh tokens |
| Password hashing | bcrypt (12 rounds) | |
| Security headers | Helmet | Configured in main.ts |
| CORS | Configured | Allowed origins set |
| Rate limiting | CONFIGURED | Via NestJS throttler |
| Input validation | class-validator | DTOs with validation pipes |
| SQL injection | PROTECTED | Prisma parameterized queries |
| XSS | PROTECTED | Helmet + input sanitization |
| CSRF | N/A | API-only (no cookies for auth) |
| Consent guard | ACTIVE | Checks legal consent before data access |
| Audit logging | MODULE EXISTS | `audit.module.ts` |

### Security Gaps
- Password complexity rules are basic (min 8 chars, could be stricter)
- No IP-based rate limiting per account (only global throttle)
- No 2FA/MFA implemented yet
- API key rotation policy not documented

---

## 10. Compliance Status

| Requirement | Status | Details |
|-------------|--------|---------|
| Quebec Loi 25 | PARTIALLY COMPLIANT | Consent guard active, privacy policy needed |
| LPRPDE (federal) | PARTIALLY COMPLIANT | Data handling OK, breach notification SOP needed |
| Bill 96 (French language) | COMPLIANT | Platform is francophone-first |
| RBQ (construction licensing) | N/A FOR NOW | Focusing on non-licensed service categories |
| CCQ | N/A FOR NOW | No construction trades on platform |
| AML/KYC | NOT REQUIRED | Below thresholds for current volume |

### Compliance Gaps
- No formal privacy policy published on website
- No data breach notification procedure documented
- No data retention/deletion policy implemented
- No cookie consent banner (Next.js not deployed yet)
- DPIA (Data Protection Impact Assessment) not completed
- See detailed report: `docs/ops/COMPLIANCE_LOI25_LPRPDE.md`

---

## 11. Infrastructure Summary

```
                     PRODUCTION ARCHITECTURE (2026-03-27)

  [GHL Forms] ──webhook──> [N8N] ──HTTP──> [NestJS Backend] <──> [PostgreSQL]
                                               │    │
                                               │    └──webhook──> [Stripe]
                                               │
  [Next.js]* ──API──> [NestJS Public API]      │
  (*not deployed)                               │
                                               │
  [Flutter App]* ──API──> [NestJS Auth API]    │
  (*in conversion)                              │

  Railway: Backend + PostgreSQL + N8N
  GHL: CRM + Automations + SMS/Email
  Stripe: Payments (webhook integration)
  GitHub: Source + CI/CD
  Vercel: Next.js (planned)
```

---

## 12. Critical Path Items

### Blockers (Must Fix)
1. **Stripe Connect Express** -- Manual activation required. Blocks worker payouts.

### High Priority
2. **Next.js landing pages** -- 5 pages needed for organic acquisition
3. **GTM + Analytics** -- No tracking installed yet
4. **Privacy policy** -- Required for Loi 25 compliance
5. **Test coverage** -- 26% is below production confidence threshold

### Medium Priority
6. **N8N Stripe -> Meta CAPI workflow** -- For conversion tracking
7. **Apollo integration** -- For lead enrichment pipeline
8. **Data engine activation** -- All pipelines still in design phase
9. **Flutter app store submission** -- Conversion from FlutterFlow in progress

---

## 13. Key Metrics Baseline

| Metric | Value (2026-03-27) |
|--------|-------------------|
| Workers onboarded | 0 |
| Clients acquired | 0 |
| Missions completed | 0 |
| GMV | $0 |
| Platform revenue | $0 |
| Monthly burn rate | TBD |
| Backend uptime | ~99.5% (Railway) |
| API response time (p95) | < 500ms |
| Database size | Minimal (schema only) |

*This baseline will be updated weekly as the platform launches operations.*

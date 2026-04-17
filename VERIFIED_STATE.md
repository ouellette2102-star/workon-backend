# VERIFIED STATE — WorkOn Production Systems

> Single source of truth. Only facts verified against live systems belong here.
> Last verified: 2026-04-17T22:55Z — architecture refresh (backend URL corrected from `-31db` to `-8908`, projet Railway identifié, DB schema confirmé)

---

## Architecture active (verified 2026-04-17)

**Frontend (Vercel)**
- Project: `workonapp` (id `prj_sJgFrCeDynMop1VAwrKJYOrdHTQL`, team `team_EKM6kRSp0l662uk6H4YB6U2l`)
- Prod domain: `https://workonapp.vercel.app`
- `NEXT_PUBLIC_API_URL` = `https://workon-backend-production-8908.up.railway.app/api/v1` (confirmed via `.vercel/.env.production.local`)

**Backend (Railway)**
- URL: **`https://workon-backend-production-8908.up.railway.app`** ← L'ACTIF
- Project: `modest-abundance` (id `8dc84d35-f3fd-49f4-9b8d-5404f6bd568f`)
- Service: `workon-backend` (id `6269ee8b-d0a9-423a-a099-e456bd88e695`)
- Region: `us-west2`, 1 replica, ACTIVE
- Latest successful deploy: **PR #237** (fix messages-local otherUser shape) — 2026-04-17 ~22:45 UTC

**Postgres (Railway)**
- Same project `modest-abundance`
- Service: `Postgres` (id `6eba078b-6d23-4c1d-84ff-a170d1bbf6a7`)
- Attached via `DATABASE_URL="${{Postgres.DATABASE_URL}}"` (service reference — confirmed via Raw Editor)
- Volume: `postgres-volume` (id `52a69289-6867-4f2b-aa36-c35b3adba914`)

**Preuves de lien frontend ↔ backend ↔ DB**
1. Vercel `NEXT_PUBLIC_API_URL` → backend -8908
2. Backend -8908 CORS_ORIGIN = `https://workonapp.vercel.app,https://workonapp-mathieu-ouellettes-projects.vercel.app` (matches Vercel domains)
3. Backend `/api/v1/health`: `checks.database.status = ok` (latency 9ms) → service reference résolue
4. Table `reviews` en prod contient colonnes `localAuthorId, localTargetUserId, localMissionId` + 1 row réel « Final smoke test » créé 2026-04-17 21:37 → migrations 17 avril appliquées sur cette DB

## Legacy (à décommissionner ou documenter)

- **Ancien backend**: `https://workon-backend-production-31db.up.railway.app` (projet `comfortable-benevolence` id `cd93c28a-204c-4c09-991e-da569bd3da87`) — **NON utilisé par Vercel prod**. Uptime 5+ jours, deploys bloqués depuis PR #198, pas de `deployVersion`. Contient aussi `n8n` et un Postgres séparé.
- **Autre projet**: `efficient-renewal` (id `7c8b6b5c-fba1-487d-853a-f0c9346ff2d7`) — Postgres standalone, 1 service.

---

## Backend -8908 (ACTIVE)

**URL**: https://workon-backend-production-8908.up.railway.app
**Status**: HEALTHY — `/api/v1/health` → `{"status":"ok","deployVersion":"2026-04-12-audit","checks":{"database":{"status":"ok","latencyMs":9},"stripe":{"status":"ok"},"storage":{"status":"ok"},"signedUrls":{"status":"ok"}}}`
**Version**: 1.0.0

### Demand Capture Endpoints (verified E2E 2026-04-03)

| Endpoint | Method | Auth | Status | How |
|---|---|---|---|---|
| `POST /api/v1/leads` | POST | None (public) | **WORKING** | curl → lead created (78ed9260...) |
| `GET /api/v1/leads` | GET | JWT + ADMIN role | **WORKING** | Returns 401 without token |
| `GET /api/v1/leads/pro/:proId` | GET | JWT | **WORKING** | Returns 401 without token |
| `PATCH /api/v1/leads/:id/status` | PATCH | JWT | **WORKING** | Returns 401 without token |
| `POST /api/v1/pros/register` | POST | None (public) | **WORKING** | curl → pro created with slug |
| `GET /api/v1/pros/:slug` | GET | None (public) | **WORKING** | curl → pro profile returned |
| `POST /api/v1/pros/:id/media` | POST | None | **WORKING** | Gallery image endpoint |

### GHL Webhook Endpoints (verified E2E 2026-03-28)

| Endpoint | Method | Auth | Status | How |
|---|---|---|---|---|
| `/api/v1/missions/webhook-ghl` | POST | None (public) | **WORKING** | curl → mission created |
| `/api/v1/pros/ghl-signup` | POST | `x-ghl-secret` header | **WORKING** | Protected by GHL_WEBHOOK_SECRET env var |

### Database Migrations (verified 2026-04-03)
- `20260403000000_add_demand_capture_system` — LeadStatus enum, leads table, slug/bio/category fields on local_users
- `20260403010000_add_pro_media` — pro_media table for gallery images
- Both applied successfully to production PostgreSQL

### Reviews — LocalUser/LocalMission dual-FK (verified 2026-04-17)

**Root cause historique** : Review table had `authorId`/`targetUserId`/`missionId` as legacy-only FKs. Les 71 users prod sont des LocalUsers (`local_xxx`) et les missions actives sont des LocalMissions (`lm_xxx`). Insertion → Prisma P2003.

**Fix (PR #232 + PR #236)** — migrations appliquées sur la DB `modest-abundance/Postgres` :
- `20260417000000_review_localuser_author` : `authorId`/`targetUserId` → nullable, ajout `localAuthorId` + FK `local_users`, CHECK XOR sur author/target
- `20260417210000_review_localmission` : ajout `localMissionId` + FK `local_missions` (ON DELETE SET NULL)
- Service `reviews.service.ts` : détection LocalUser/LocalMission + routing vers le bon FK

**Smoke test prod E2E (2026-04-17 21:37)** : 1 review créé avec `rating=5`, `comment="Final smoke test"`, `localAuthorId=local_1776385987494_…`, `localTargetUserId=local_1776385986645_…`, `localMissionId=lm_84a2a3ea80d940ca`, legacy FKs NULL. Confirme routing LocalAuthor + LocalTarget + LocalMission. Vérifié via Data browser Railway.

**Tests** : 21/21 pass dans `src/reviews/` sur main.
**PRs** : #232 (localAuthorId), #233–235 (diag logs temp), #236 (localMissionId + cleanup diag).

### Railway Env Vars (added 2026-04-03)
| Variable | Value | Status |
|---|---|---|
| `N8N_WEBHOOK_BASE` | https://n8n-production-9b4ce.up.railway.app | Set |
| `SENDGRID_FROM_EMAIL` | noreply@workon.app | Set |
| `SENDGRID_API_KEY` | — | **NOT SET** (needs user credential) |
| `GHL_WEBHOOK_URL` | — | **NOT SET** (needs user credential) |
| `GHL_WEBHOOK_SECRET` | — | **NOT SET** (needs user credential) |

**Implementation**: `src/leads/` (LeadsModule, LeadsService, LeadsController) + `src/pros/` (ProsService, ProsController)
**PRs**: #149 (demand capture), #150 (ghl fix), #151 (env validation fix), #152 (idempotent migration)

---

## N8N (Railway)

**URL**: https://n8n-production-9b4ce.up.railway.app
**Version**: 2.13.4
**Status**: RUNNING, authenticated via browser session
**API Keys**: 8 keys exist (claude, claude-auto-2, claude-fix-3, diagnostics-2026, WorkOn API, WorkOn Automation, WorkOn Final, WorkOn Workflows)

### Workflows — ALL FIXED + W8 ADDED (verified 2026-04-03T04:00Z)

All `$json.body.` and `.json.body.` references replaced with `$json.` / `.json.` across all 7 workflows.
Stale backend URLs (`production-31db` staging) replaced with `production-8908` (production) in W2 and W3.
Fix applied via N8N Public API (PUT /api/v1/workflows/{id}) using programmatically created API key.

**W8: New Lead → GHL + Log** created 2026-04-03 via API. Webhook path: `/webhook/new-lead`. E2E verified: backend lead creation triggers N8N execution within 178ms.

### Environment Variables (37 total, verified 2026-03-28T20:46Z)

All required env vars are configured in Railway N8N service:

| Variable | Service | Status |
|---|---|---|
| `WORKON_API_KEY` | WorkOn Backend | Set |
| `GHL_API_KEY` | GoHighLevel | Set |
| `GHL_PIPELINE_ID`, `GHL_STAGE_*` (x3), `GHL_MATHIEU_CONTACT_ID` | GHL Pipeline | Set |
| `ONESIGNAL_REST_API_KEY`, `ONESIGNAL_APP_ID` | OneSignal Push | Set |
| `NOTION_API_KEY`, `NOTION_MISSIONS_DB_ID` | Notion KPI | Set |
| `PDFMONKEY_API_KEY`, `PDFMONKEY_CONTRACT_TEMPLATE_ID` | PDFMonkey Contracts | Set |
| `ANTHROPIC_API_KEY` | Claude API (W4 social) | Set |
| `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` | Meta/Facebook | Set |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram | Set |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Set |

| ID | Name | body refs | Active | Status |
|---|---|---|---|---|
| miwHVn8lnG5IVtHU | GHL Mission -> WorkOn Backend | 0 | true | **E2E VERIFIED** — FIXED & PUBLISHED |
| ymOfgEDXVlvSS0Ue | GHL Worker Signup -> WorkOn Backend | 0 | true | **E2E VERIFIED** — FIXED & PUBLISHED |
| pdeXrrJvTMsMxPAK | W1: Mission Créée → Match → Notify | 0 | true | **FIXED & PUBLISHED** |
| LPja9o5pNlj9Whvp | W2: Offre Acceptée → Contrat → Escrow | 0 | true | **FIXED & PUBLISHED** |
| VNrFJszb85IvQfBY | W3: Mission Complétée → Payout | 0 | true | **FIXED & PUBLISHED** |
| GWj6WJlBVKDPdy6U | W4: Promotion Réseaux Sociaux | 0 | true | **FIXED & PUBLISHED** |
| YEuFCrSEIVygCG7U | Pro Signup Auto-Approval | 0 | true | **FIXED & PUBLISHED** |
| q6sHeGMUTlS6mt05 | W8: New Lead → GHL + Log | 0 | true | **E2E VERIFIED** — Created 2026-04-03 |

**Execution stats**: 12 total executions. W8 E2E verified: lead POST → N8N webhook fires in 178ms.

---

## Stripe (Live)

**Account**: acct_1SWIWDCm3RnXcbKH
**Status**: LIVE mode active

### Products (5 active, cleaned 2026-03-28)

| Product | Price | Status |
|---|---|---|
| Mission Standard | $49.99 | Active (1 price) |
| Mission Premium | $99.99 | Active (1 price) |
| Commission WorkOn 15% | usage-based | Active (1 price) |
| Abonnement Pro Mensuel | $29.99/month | Active (1 price) |
| Abonnement Pro Annuel | $299.99/year | Active (1 price) |

**Cleaned**: 5 duplicate prices archived + 1 test product archived
**Revenue**: $0 (pre-launch)
**Connect Express**: NOT activated (manual action required on dashboard.stripe.com)

---

## GHL (GoHighLevel)

**Sub-account**: oECRc7HEiImpIIDLLQB0
**Status**: Trial — expiring ~2026-03-29
**Setup**: ~10% (dashboard accessible, automation/contacts pages freeze browser)
**Contacts**: 0
**Opportunities**: 2
**Revenue**: $0

### Blocking Issues
- Trial expiring in ~1 day — user purchasing tomorrow
- Automation page freezes browser renderer (SPA issue)
- No email/SMS sequences configured yet

---

## GitHub

**Repo**: ouellette2102-star/workon-backend
**Branch protection**: main requires PRs, no direct push
**Latest on main**: PR #152 (idempotent migration fix)
**Recent PRs**: #149 demand capture, #150 ghl fix, #151 env validation fix, #152 migration fix

---

## Known Issues / Next Actions (Priority Order)

1. **SENDGRID_API_KEY** — Must be set in Railway for lead notification emails to send. Requires SendGrid account credential.
2. **GHL_WEBHOOK_URL + GHL_WEBHOOK_SECRET** — Must be set in Railway for GHL lead forwarding. Requires GHL account credential.
3. **FRONTEND_URL on Railway** — Set to custom domain once configured (e.g., `https://workon.app`). Currently CORS is open; needs lock-down for production.
4. **Custom domain** — Add `workon.app` to Vercel and set `FRONTEND_URL` on Railway backend to match.
5. **Stripe Connect Express** — Requires manual activation on dashboard.stripe.com.
6. **Vercel redeploy** — Push frontend changes (API URL fix) to trigger Vercel production build with correct `NEXT_PUBLIC_API_URL`.
7. ~~**N8N new-lead workflow**~~ — **DONE** (2026-04-03). W8 created via API, webhook at `/webhook/new-lead`, E2E verified 178ms latency.
8. ~~**Next.js frontend API wiring**~~ — **DONE** (2026-04-03). Fixed stale fallback URL (8908→31db), fixed path mismatch in public-api.ts, set `NEXT_PUBLIC_API_URL` in .env.local.
9. ~~**Demand capture system**~~ — **DONE** (2026-04-03). Full system deployed: pro registration, public profiles, lead creation, duplicate detection, auth guards.
10. ~~**N8N body mapping fix**~~ — **DONE** (2026-03-28).
11. ~~**N8N stale backend URLs**~~ — **DONE** (2026-03-28).

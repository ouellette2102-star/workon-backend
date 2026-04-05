# VERIFIED STATE — WorkOn Production Systems

> Single source of truth. Only facts verified against live systems belong here.
> Last verified: 2026-04-04T04:10Z (W8 N8N workflow + frontend API URL fixes + CORS verified)

---

## Backend (Railway)

**URL**: https://workon-backend-production-31db.up.railway.app
**Status**: HEALTHY (verified via /healthz — `{"status":"ok"}`)
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

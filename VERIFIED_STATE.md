# VERIFIED STATE — WorkOn Production Systems

> Single source of truth. Only facts verified against live systems belong here.
> Last verified: 2026-03-28T20:55Z (Live curl + N8N API verification of all systems)

---

## Backend (Railway)

**URL**: https://workon-backend-production-8908.up.railway.app
**Status**: HEALTHY (all checks ok — DB 61ms, Stripe 182ms, Storage ok, SignedUrls ok)
**Environment**: production
**Version**: 1.0.0
**Uptime**: 148,817s (~41h)
**Memory**: 119MB RSS, 41MB heap used / 49MB heap total

### GHL Webhook Endpoints (verified E2E 2026-03-28)

| Endpoint | Method | Auth | Status |
|---|---|---|---|
| `/api/v1/missions/webhook-ghl` | POST | None (public) | **WORKING** — curl → mission created |
| `/api/v1/pros/ghl-signup` | POST | `x-ghl-secret` header | **WORKING** — Protected by GHL_WEBHOOK_SECRET |

**Implementation**: `src/ghl/ghl.service.ts` (createMissionFromGhl + registerProFromGhl)
**Module**: GhlModule + ProsModule registered in AppModule

### Also live (staging)

**URL**: https://workon-backend-production-31db.up.railway.app
**Status**: DEGRADED (staging environment — not used by N8N workflows)

---

## N8N (Railway)

**URL**: https://n8n-production-9b4ce.up.railway.app
**Version**: 2.13.4
**Region**: us-west2, 1 replica
**Status**: RUNNING, Docker image n8nio/n8n:latest
**API Keys**: 8 keys (claude, claude-auto-2, claude-fix-3, diagnostics-2026, WorkOn API, WorkOn Automation, WorkOn Final, WorkOn Workflows)

### Workflows — ALL CLEAN (live verified 2026-03-28T20:55Z)

| ID | Name | Nodes | body refs | stale URLs | Active | Status |
|---|---|---|---|---|---|---|
| miwHVn8lnG5IVtHU | GHL Mission -> WorkOn Backend | 2 | 0 | 0 | true | **E2E VERIFIED** |
| ymOfgEDXVlvSS0Ue | GHL Worker Signup -> WorkOn Backend | 2 | 0 | 0 | true | **E2E VERIFIED** |
| pdeXrrJvTMsMxPAK | W1: Mission Créée → Match → Notify | 12 | 0 | 0 | true | **CLEAN** |
| LPja9o5pNlj9Whvp | W2: Offre Acceptée → Contrat → Escrow | 11 | 0 | 0 | true | **CLEAN** |
| VNrFJszb85IvQfBY | W3: Mission Complétée → Payout | 13 | 0 | 0 | true | **CLEAN** |
| GWj6WJlBVKDPdy6U | W4: Promotion Réseaux Sociaux | 9 | 0 | 0 | true | **CLEAN** |
| YEuFCrSEIVygCG7U | Pro Signup Auto-Approval | 4 | 0 | 0 | true | **CLEAN** |

### What was fixed (2026-03-28)

1. **`$json.body.`** → `$json.` — N8N webhook nodes expose POST data at `$json.*`, not `$json.body.*`
2. **`item.json.body.`** → `item.json.` — Same bug in `$('NodeName').item.json.body.field` expressions
3. **Stale backend URLs** — W2, W3, GHL Bridge workflows pointed to staging (`31db`) instead of production (`8908`)

### Workflow Node Map

| Workflow | External Services Used |
|---|---|
| W1: Mission Créée | WorkOn Backend (matching), OneSignal (push), GHL (SMS + pipeline) |
| W2: Offre Acceptée | PDFMonkey (contract PDF), GHL (email + pipeline), WorkOn Backend (escrow), OneSignal (reminder) |
| W3: Mission Complétée | WorkOn Backend (payout), GHL (pipeline + SMS + email), Notion (KPI), OneSignal (review request) |
| W4: Promotion Réseaux | Anthropic Claude API (social copy), Meta Facebook + Instagram (posts), Notion (log), GHL (SMS Mathieu) |
| Pro Signup | None (internal logic only — webhook → IF score → respond) |

### Environment Variables (37 total, verified on Railway dashboard 2026-03-28T20:46Z)

| Variable | Service | Status |
|---|---|---|
| `WORKON_API_KEY` | WorkOn Backend | Set |
| `GHL_API_KEY` | GoHighLevel | Set |
| `GHL_PIPELINE_ID`, `GHL_STAGE_MISSION_ACTIVE`, `GHL_STAGE_BOOKED`, `GHL_STAGE_COMPLETED` | GHL Pipeline | Set |
| `GHL_MATHIEU_CONTACT_ID` | GHL Founder notifications | Set |
| `ONESIGNAL_REST_API_KEY`, `ONESIGNAL_APP_ID` | OneSignal Push | Set |
| `NOTION_API_KEY`, `NOTION_MISSIONS_DB_ID` | Notion KPI | Set |
| `PDFMONKEY_API_KEY`, `PDFMONKEY_CONTRACT_TEMPLATE_ID` | PDFMonkey Contracts | Set |
| `ANTHROPIC_API_KEY` | Claude API (W4 social posts) | Set |
| `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` | Meta/Facebook | Set |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram | Set |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Set |
| + 8 Railway system vars, N8N core config vars (DB, auth, encryption, timezone) | Infrastructure | Set |

**Execution stats**: 9 total executions, first 5 failed (body mapping bug), last 2 successful (GHL bridge E2E).

---

## Stripe (Live)

**Account**: acct_1SWIWDCm3RnXcbKH (WorkOn)
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
**Connect Express**: NOT activated — requires manual onboarding on dashboard.stripe.com (business verification + bank account)

---

## GHL (GoHighLevel)

**Sub-account**: oECRc7HEiImpIIDLLQB0
**Status**: Trial — expiring ~2026-03-29
**Setup**: ~10% (dashboard accessible, automation/contacts pages freeze browser)
**Contacts**: 0
**Opportunities**: 2
**Revenue**: $0

### Blocking Issues
- Trial expiring — user purchasing subscription
- Automation page freezes browser renderer (GHL SPA issue, not our bug)
- No email/SMS sequences configured yet

---

## GitHub

**Repo**: ouellette2102-star/workon-backend
**Branch protection**: main requires PRs, no direct push

### Recent PRs
| PR | Title | Status |
|---|---|---|
| #146 | fix(n8n): deep audit — fix item.json.body refs + stale backend URLs | **MERGED** |
| #145 | fix(n8n): fix $json.body. mapping bug (duplicate) | Closed |
| #144 | fix(n8n): fix $json.body. mapping bug in all 7 workflows | **MERGED** |
| #143 | Feat/verified state agent sync | **MERGED** |
| #141 | GHL webhook bridge + ProsModule | **MERGED** |

---

## Known Issues / Next Actions (Priority Order)

1. ~~**N8N: Fix all body mapping**~~ — **DONE** (2026-03-28T20:55Z). 3 passes: `$json.body.`, `item.json.body.`, final live verification.
2. ~~**N8N: Fix stale backend URLs**~~ — **DONE** (2026-03-28T20:55Z). All 7 workflows now point to production (`8908`).
3. ~~**N8N: Publish all workflows**~~ — **DONE**. All 7 active=true, 0 body refs, 0 stale URLs.
4. ~~**N8N API key**~~ — **DONE**. Created `claude-fix-3` key programmatically (never expires, workflow scopes).
5. ~~**N8N env vars audit**~~ — **DONE**. All 37 vars configured in Railway.
6. **Stripe Connect Express** — Requires manual activation on dashboard.stripe.com (business verification + bank account setup). Cannot be automated via API.
7. **GHL purchase** — User purchasing subscription. Requires payment.
8. **E2E workflow test (W1-W4)** — Trigger a real GHL form → verify full chain (N8N → Backend → OneSignal/PDFMonkey/Notion/Meta). Blocked by GHL trial expiry. After GHL purchase, this is the next priority.

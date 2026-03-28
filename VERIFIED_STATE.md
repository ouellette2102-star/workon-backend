# VERIFIED STATE — WorkOn Production Systems

> Single source of truth. Only facts verified against live systems belong here.
> Last verified: 2026-03-28T20:46Z (Full audit: workflows, env vars, backend URLs, Stripe)

---

## Backend (Railway)

**URL**: https://workon-backend-production-8908.up.railway.app
**Status**: HEALTHY (verified via /api/v1/health — DB ok, Stripe ok, Storage ok)
**Uptime**: 122,256s at time of check
**Memory**: 120MB RSS, 41MB heap used

### GHL Webhook Endpoints (verified E2E 2026-03-28)

| Endpoint | Method | Auth | Status | How |
|---|---|---|---|---|
| `/api/v1/missions/webhook-ghl` | POST | None (public) | **WORKING** | curl → mission created (lm_ghl_1774704754727_wjq6bkab3) |
| `/api/v1/pros/ghl-signup` | POST | `x-ghl-secret` header | **WORKING** | Protected by GHL_WEBHOOK_SECRET env var |

**Implementation**: `src/missions/missions.service.ts` (createFromGhl) + `src/pros/pros.service.ts` (handleGhlSignup)
**Module**: ProsModule registered in AppModule (via PR #141)

---

## N8N (Railway)

**URL**: https://n8n-production-9b4ce.up.railway.app
**Version**: 2.13.4
**Status**: RUNNING, authenticated via browser session
**API Keys**: 8 keys exist (claude, claude-auto-2, claude-fix-3, diagnostics-2026, WorkOn API, WorkOn Automation, WorkOn Final, WorkOn Workflows)

### Workflows — ALL FIXED (verified 2026-03-28T20:46Z)

All `$json.body.` and `.json.body.` references replaced with `$json.` / `.json.` across all 7 workflows.
Stale backend URLs (`production-31db` staging) replaced with `production-8908` (production) in W2 and W3.
Fix applied via N8N Public API (PUT /api/v1/workflows/{id}) using programmatically created API key.

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

**Execution stats**: 9 total executions, first 5 failed (body mapping), last 2 succeeded.

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
**Latest on main**: PR #144 merged (N8N body mapping fix + VERIFIED_STATE update)
**PR #145**: Closed (duplicate of #144)

---

## Known Issues / Next Actions (Priority Order)

1. ~~**N8N: Fix all body mapping**~~ — **DONE** (2026-03-28T20:46Z). Fixed `$json.body.` AND `item.json.body.` patterns in W1-W4 + Pro Signup.
2. ~~**N8N: Fix stale backend URLs**~~ — **DONE** (2026-03-28T20:46Z). W2 and W3 pointed to staging (`31db`), now point to production (`8908`).
3. ~~**N8N: Publish all workflows**~~ — **DONE**. All 7 active=true, 0 body refs.
4. ~~**N8N API key**~~ — **DONE**. Created `claude-fix-3` key programmatically.
5. ~~**N8N env vars audit**~~ — **DONE** (2026-03-28T20:46Z). All 37 vars configured in Railway.
6. **Stripe Connect Express** — Requires manual activation on dashboard.stripe.com (business verification + bank account setup). Cannot be automated.
7. **GHL purchase** — User purchasing subscription ~2026-03-29. Requires payment.
8. **E2E workflow test** — Trigger a real GHL form → verify full chain (N8N → Backend → 3rd party APIs). Blocked by GHL trial expiry.

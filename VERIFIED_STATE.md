# VERIFIED STATE — WorkOn Production Systems

> Single source of truth. Only facts verified against live systems belong here.
> Last verified: 2026-03-28T17:40Z

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

### Workflows (7 total, all active=true, all published)

| ID | Name | Webhook Path | Target | Status |
|---|---|---|---|---|
| miwHVn8lnG5IVtHU | GHL Mission -> WorkOn Backend | `/webhook/ghl-mission` | `/api/v1/missions/webhook-ghl` | **E2E VERIFIED** (exec #8, success, 257ms) |
| ymOfgEDXVlvSS0Ue | GHL Worker Signup -> WorkOn Backend | `/webhook/ghl-worker-signup` | `/api/v1/pros/ghl-signup` | **E2E VERIFIED** (exec #9, success, 233ms) |
| pdeXrrJvTMsMxPAK | W1: Mission Créée → Match → Notify Pros | TBD | TBD | Published, untested |
| LPja9o5pNlj9Whvp | W2: Offre Acceptée → Contrat → Escrow | TBD | TBD | Published, untested |
| VNrFJszb85IvQfBY | W3: Mission Complétée → Payout → Review → Notion KPI | TBD | TBD | Published, untested |
| GWj6WJlBVKDPdy6U | W4: Mission Créée → Promotion Réseaux Sociaux | TBD | TBD | Published, untested |
| YEuFCrSEIVygCG7U | Pro Signup Auto-Approval | TBD | TBD | Published, untested |

**Execution stats**: 9 total executions, 100% failure rate on first 5 (body mapping bug, now fixed), last 2 successful.

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
**Latest on main**: PR #141 merged (GHL webhook bridge + ProsModule)
**PR #142**: Closed (superseded by PR #141 — GHL FK fix already on main)

---

## Known Issues / Next Actions

1. **Stripe Connect Express**: Manual activation needed on dashboard.stripe.com
2. **GHL purchase**: User purchasing subscription ~2026-03-29
3. **W1-W4 workflows**: Published but untested — need credential verification (GHL API, OneSignal, PDFMonkey, Notion)
4. **N8N body mapping**: Fixed for GHL Mission + Worker Signup workflows. W1-W4 not yet verified.

# WorkOn — VERIFIED STATE
**Last verified: 2026-03-28 08:35 EDT**
**Verified by: Claude Code (live audit via Stripe MCP + N8N API + GHL Chrome)**

> **RULE**: This file contains ONLY facts verified against live systems.
> Every agent session MUST read this file first and update it after making changes.
> Never write plans or intentions here — only verified production state.

---

## 1. STRIPE (Live — acct_1SWIWDCm3RnXcbKH)

### Products (5 active)
| Product | Price ID | Amount | Type |
|---------|----------|--------|------|
| Commission WorkOn (15%) | `price_1TEo91Cm3RnXcbKHr0jeaQxq` | $50.00 CAD | one_time |
| WorkOn Pro | `price_1TEbmxCm3RnXcbKHE3Y8cOiQ` | $29.00/mo CAD | recurring |
| WorkOn Boost | `price_1TEbmyCm3RnXcbKHNxSk7nF4` | $9.99 CAD | one_time |
| WorkOn Entreprise | `price_1TEbmzCm3RnXcbKHBF9QN8kV` | $99.00/mo CAD | recurring |
| Mission de service | `price_1TEvrMCm3RnXcbKHjbezriIm` | $49.00 CAD | one_time |

### Archived (cleaned 2026-03-28)
- 5 duplicate prices archived
- 1 test product (`prod_UENrsx6yBgOktq`) archived

### Revenue State
- Customers: **0**
- Subscriptions: **0**
- Completed payments: **0**
- Balance: **$0.00 CAD**
- Connect Express: **NOT ACTIVATED** (requires manual dashboard action)

### Webhook
- ID: `we_1T7NJUCm3RnXcbKHsShElkth`
- URL: `https://workon-backend-production-8908.up.railway.app/api/v1/webhooks/stripe`
- Events: payment_intent.succeeded/failed/canceled, checkout.session.completed, account.updated, customer.subscription.*

---

## 2. N8N (Production — Railway)
**URL**: https://n8n-production-9b4ce.up.railway.app
**Version**: 2.13.4

### Workflows
| # | Name | ID | Active | Nodes | Status |
|---|------|----|--------|-------|--------|
| 1 | GHL Mission → Backend | `miwHVn8lnG5IVtHU` | **YES** | 2 | Fixed body mapping 2026-03-28 |
| 2 | GHL Worker Signup → Backend | `ymOfgEDXVlvSS0Ue` | **YES** | 2 | Fixed body mapping 2026-03-28 |
| 3 | Pro Signup Auto-Approval | `YEuFCrSEIVygCG7U` | **YES** | 4 | Not yet tested E2E |
| 4 | W1: Mission Créée → Match → Notify | `pdeXrrJvTMsMxPAK` | **NO** | 12 | Built, not published — needs credential verification |
| 5 | W2: Offre Acceptée → Contrat → Escrow | (see N8N) | **NO** | 11 | Built, not published — needs credential verification |
| 6 | W3: Mission Complétée → Payout → Review | (see N8N) | **NO** | 13 | Built, not published — needs credential verification |
| 7 | __API_TEST__ | `2sBch1CSleLl83Qd` | **NO** | 0 | Empty shell, should be archived |

### Execution History
- Total executions: 5 (all from 2026-03-27)
- All 5 failed with 404 (endpoints not deployed yet at time of test)
- **Body mapping bug fixed on 2026-03-28**: changed `$json.body` → `JSON.stringify($json)`
- **No successful execution has ever occurred**

### Webhook URLs (for GHL forms)
- Mission: `https://n8n-production-9b4ce.up.railway.app/webhook/ghl-mission`
- Worker Signup: `https://n8n-production-9b4ce.up.railway.app/webhook/ghl-worker-signup`

---

## 3. GHL (Sub-account: oECRc7HEiImpIIDLLQB0)

### Account State
- Sub-account name: **WorkOn**
- Location: **Repentigny, Québec**
- Agency setup progress: **10%**
- **TRIAL EXPIRING: 1 day left (expires ~2026-03-29)**
- User will purchase tomorrow

### Verified Data
- Contacts: **0**
- Opportunities: **2 open**
- Revenue: **$0**
- Funnel: "WorkOn — Employeurs" exists

### NOT VERIFIED (page freezes prevented audit)
- Automations/Workflows — could not load page
- Forms — could not verify
- Email sequences — **NOT CREATED** (no evidence found)
- SMS sequences — **NOT CREATED** (no evidence found)
- Conversation AI — **NOT CONFIGURED** (no evidence found)
- Phone services — claimed 100% configured, not verified

### GHL API Access
- API calls from N8N use `services.leadconnectorhq.com`
- Bearer token required for API calls (stored in N8N credentials)

---

## 4. BACKEND (NestJS — Railway)
**URL**: https://workon-backend-production-8908.up.railway.app
**Status**: LIVE

### Deployed Endpoints (verified with curl)
| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/api/v1/missions/webhook-ghl` | POST | None (server-to-server) | Returns 500 with empty body (expected — validation) |
| `/api/v1/pros/ghl-signup` | POST | x-ghl-secret header | Returns 401 without header (expected) |
| `/api/v1/public/stats` | GET | None | **404 — NOT DEPLOYED on this version** |

### GHL DTO Requirements
**Mission webhook** expects: `title`, `description`, `category`, `price`, `latitude`, `longitude`, `city`, `address?`, `ghlContactId?`, `clientEmail?`, `clientName?`
**Pro signup** expects: `firstName`, `lastName`, `email`, `phone?`, `city?`, `categories?`, `ghlContactId?`, `source?`

### Database
- PostgreSQL via Prisma
- Latest migration: `20260327000000_add_public_profile_fields` (applied)
- Models: 40, Modules: 39

### Code (main branch)
- Latest commit: `673036a docs(ops): add engineering SOPs, compliance, and operational guides`
- GHL module: `src/ghl/` (controller + service + DTOs)
- Stripe module: `src/stripe/` + `src/payments/` + `src/payments-local/`

---

## 5. GITHUB
- Repo: `ouellette2102-star/workon-backend`
- Main branch: `main`
- Last merged PR: #141 (2026-03-27)
- Worktree branch: `claude/quirky-noether` (behind main by 4 commits)

---

## 6. NOTION (via MCP)
### Marketing Hub (parent: 32bf361b1a3d8165bfbeef74743d5cd5)
- 9 pages created: Competitive Brief, SEO Keywords, Worker Campaign, Client Campaign, Brand Voice, Content Calendar, 3 SEO Articles

### CEO Vision (parent: 32bf361b1a3d81aa9685f4722bac45d4)
- 1 page: Market Sizing Quebec

---

## BLOCKING ISSUES (ordered by priority)

1. **GHL Trial expires ~2026-03-29** — User will purchase tomorrow
2. **N8N workflows never successfully executed** — Body mapping fixed, needs E2E test with real GHL form submission
3. **Stripe Connect Express not activated** — Blocks worker payouts
4. **W1/W2/W3 workflows not published** — Need credential verification (GHL API token, OneSignal, PDFMonkey)
5. **GHL email/SMS sequences not created** — Need GHL trial to be active
6. **0 customers, 0 revenue** — System is built but has never processed a real transaction

## NEXT ACTIONS (executable)
1. Test N8N webhooks E2E by sending test payloads
2. Verify W1/W2/W3 credential configuration before publishing
3. Create GHL email welcome sequence for employers (after trial resolved)
4. Create GHL SMS sequence for workers J0/J3/J7 (after trial resolved)
5. Configure GHL Conversation AI prompt (after trial resolved)
6. Activate Stripe Connect Express (manual — dashboard.stripe.com)

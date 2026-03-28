# WorkOn -- Revenue Baseline Report

**Period:** March 2026
**Generated:** 2026-03-27
**Data Source:** Stripe account `acct_1SWIWDCm3RnXcbKH` + codebase infrastructure docs

---

## Stripe Account Summary

| Field | Value |
|-------|-------|
| Account ID | `acct_1SWIWDCm3RnXcbKH` |
| Mode | Live |
| Currency | CAD |
| Connect Express | NOT ACTIVATED |
| Webhook | Registered (`we_1T7NJUCm3RnXcbKHsShElkth`) |

---

## Products Catalog (5 products)

| # | Product | Product ID | Price ID | Price | Type |
|---|---------|------------|----------|-------|------|
| 1 | Commission (per-transaction) | `prod_UD0yxD9E0c21PJ` | -- | Variable (12% fee) | One-time |
| 2 | WorkOn Pro | `prod_UD0yPz1whEDwIf` | `price_1TEbmxCm3RnXcbKHE3Y8cOiQ` | $29.00/mo | Recurring |
| 3 | WorkOn Boost | `prod_UD0y6fFS2ncD7V` | `price_1TEbmyCm3RnXcbKHNxSk7nF4` | $9.99 | One-time |
| 4 | WorkOn Entreprise | `prod_UD0yASrocfUxsu` | `price_1TEbmzCm3RnXcbKHBF9QN8kV` | $99.00/mo | Recurring |
| 5 | (5th product ID not documented) | -- | -- | -- | -- |

**Note:** The infrastructure docs reference "5 products created" but only 4 have documented IDs. The 5th product may be a test product or an additional tier. Verify via Stripe dashboard.

---

## Revenue Streams

### 1. Transaction Commission (Primary)
- **Rate:** 12% platform fee on every mission payment
- **Mechanism:** `application_fee_amount` on Stripe PaymentIntents
- **Status:** Code implemented but Stripe Connect not activated (fees collected to platform account only)
- **Current revenue:** $0.00 (no transactions processed yet)

### 2. WorkOn Pro Subscription ($29/mo)
- **Target:** Workers who want premium features (priority in feed, badge, analytics)
- **MRR potential:** $29 x subscriber count
- **Current subscribers:** 0
- **Current MRR:** $0.00

### 3. WorkOn Boost ($9.99 one-time)
- **Target:** Workers who want temporary visibility boost
- **Revenue model:** One-time purchase per boost
- **Current sales:** 0
- **Current revenue:** $0.00

### 4. WorkOn Entreprise ($99/mo)
- **Target:** Employers/companies with high volume hiring needs
- **MRR potential:** $99 x subscriber count
- **Current subscribers:** 0
- **Current MRR:** $0.00

---

## Current Financial Baseline

| Metric | Value |
|--------|-------|
| **Total Revenue (all time)** | $0.00 CAD |
| **MRR** | $0.00 CAD |
| **ARR** | $0.00 CAD |
| **Active Customers** | 0 |
| **Active Subscriptions** | 0 |
| **Transactions Processed** | 0 |
| **Platform Fees Collected** | $0.00 CAD |
| **Stripe Balance** | $0.00 CAD (estimated) |
| **Disputes** | 0 |
| **Refunds** | 0 |

**Note:** Stripe MCP API tools were permission-blocked during this audit. The above figures are based on the pre-launch status documented in the system. All products were created but no customers or transactions exist yet. Verify exact balance via Stripe dashboard.

---

## Blockers to First Revenue

| # | Blocker | Status | Owner |
|---|---------|--------|-------|
| 1 | Stripe Connect Express not activated | BLOCKED | Human (dashboard) |
| 2 | No pilot customers registered | BLOCKED | Growth team |
| 3 | Worker onboarding flow not complete | BLOCKED | CTO (code stubs) |
| 4 | GHL worker registration form not created | BLOCKED | Human (GHL) |
| 5 | Landing pages not built (Next.js) | BLOCKED | CTO |

---

## Revenue Projections (J30 Targets)

Based on growth engine targets (from `memory/growth.md`):

| Metric | Target (J30) |
|--------|-------------|
| Employers registered | 5 |
| Workers registered | 15 |
| Transactions completed | 1-3 |
| Average mission value | $150-$500 CAD (estimated) |
| Commission revenue (12%) | $18-$180 CAD |
| Pro subscriptions | 2-5 workers |
| Subscription MRR | $58-$145 CAD |
| **Total projected MRR** | **$76-$325 CAD** |

---

## Cost Structure (Monthly)

| Item | Cost |
|------|------|
| Railway (backend + DB) | ~$20/mo |
| Railway (N8N) | ~$10/mo |
| Stripe fees (2.9% + $0.30/tx) | Variable |
| GoHighLevel | $97/mo (or included in agency plan) |
| Domain (workon.ca) | ~$2/mo |
| SendGrid | Free tier |
| **Total fixed costs** | **~$129/mo** |

---

## Breakeven Analysis

- Fixed costs: ~$129/mo
- Average commission per transaction (12% of $300 avg): $36
- Transactions needed for breakeven on commission alone: ~4/month
- Pro subscriptions needed for breakeven: ~5 at $29/mo

**Breakeven target: 4 transactions/month OR 5 Pro subscribers**

---

## Recommended Next Actions

1. **Activate Stripe Connect Express** (see `STRIPE_CONNECT_ACTIVATION.md`)
2. **Register first 5 pilot employers** via GHL or direct outreach
3. **Onboard first 15 workers** with complete Stripe Connect onboarding
4. **Process first test transaction** end-to-end (employer -> mission -> worker -> payout)
5. **Set up Stripe revenue dashboard** in Looker Studio or Stripe's built-in reports
6. **Verify Stripe MCP tool permissions** to enable automated reporting

---

## Audit Notes

- This report was generated on 2026-03-27 as the baseline for Bloc 3 of the WorkOn 100% activation plan
- Stripe API calls (list_products, list_prices, retrieve_balance, list_customers) were attempted via MCP tools but permission was denied by the session
- All data sourced from documented infrastructure state in `memory/infrastructure.md` and `memory/execution_state.md`
- A follow-up audit with live Stripe API access is recommended to confirm all product/price configurations

# Runbook — Admin refund

Emergency path to refund a paid invoice. Keep this page short and step-by-step; operators reading it are on a clock.

## When to use

- Employer disputes a mission and you (as admin) have decided to refund.
- Worker completed work incorrectly and employer insists on a refund.
- Accidental double-payment (rare — Stripe webhooks are idempotent, but not impossible).
- Legal/compliance request (CAI, law enforcement, tax authority).

**Do not use this path** for scheduled cancellations during the normal cancel window — that flow goes through `POST /missions-local/:id/cancel`, which handles refund automatically for unauthorized / unpaid invoices.

## Preconditions

- You have an ADMIN JWT (`role: "admin"` on your LocalUser or `UserRole.ADMIN` on your User).
- The invoice is in `PAID` status and has a `stripePaymentIntentId`. If it's in `PENDING` / `PROCESSING`, you cannot refund it — either cancel the checkout session directly in Stripe, or wait for it to settle.

## Steps

1. **Identify the invoice**

   ```sh
   curl -sS -H "Authorization: Bearer $ADMIN_JWT" \
     "https://workon-backend-production-8908.up.railway.app/api/v1/payments/invoices/mine" \
     | jq '.[] | select(.status=="PAID")'
   ```

   Or query Postgres directly:

   ```sql
   SELECT id, "totalCents", currency, "stripePaymentIntentId", "localMissionId"
   FROM invoices
   WHERE status = 'PAID'
     AND "payerUserId" = '<user_id>'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

2. **Decide refund shape**

   - **Full refund**: omit `amountCents`, backend uses `invoice.totalCents`.
   - **Partial refund**: pass `amountCents` in cents (e.g. `5000` for $50).
   - **Reverse the worker payout?** Only flip `reverseWorkerTransfer: true` if the worker did not in fact perform the work. By default (false), the platform absorbs the refund and the worker keeps their payout — that is the right call for goodwill refunds after a completed mission.

3. **Fire the refund**

   ```sh
   curl -sS -X POST \
     -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "reason": "Mission cancelled after dispute resolution (case #1234)",
       "amountCents": 5000,
       "reverseWorkerTransfer": false
     }' \
     "https://workon-backend-production-8908.up.railway.app/api/v1/admin/invoices/<invoiceId>/refund"
   ```

   Expected 201 response:

   ```json
   {
     "invoiceId": "clxyz...",
     "stripeRefundId": "re_...",
     "amountRefundedCents": 5000,
     "currency": "CAD",
     "invoiceStatus": "REFUNDED",
     "partial": true,
     "workerTransferReversalId": null
   }
   ```

4. **Verify**

   - Stripe dashboard → Payments → the PaymentIntent should show a refund line item.
   - `SELECT status, metadata->'refunds' FROM invoices WHERE id = '<invoiceId>';` — `status` should be `REFUNDED` and the `refunds` array should contain your entry with `reason`, `adminId`, `stripeRefundId`, `at`.
   - `TrustAuditLog` table → a `refund_invoice` row with the admin's userId (written by the `@AdminAction` decorator via the admin action interceptor).

5. **Notify the user** — the endpoint does not currently send the employer a courtesy email. Send one manually from Gmail or Intercom, referencing the refund ID.

## Failure modes

| What you see | What it means | What to do |
|---|---|---|
| `400 Cannot refund invoice in status <X>` | Invoice isn't `PAID`. | Check the invoice lifecycle. You likely need to cancel the checkout, not refund. |
| `400 Invoice has no stripePaymentIntentId` | Webhook hasn't attached a PaymentIntent to this invoice. | Investigate in Stripe; if the payment actually settled, patch the row manually then retry. |
| `400 Refund amount X exceeds invoice total Y` | Typo in `amountCents`. | Fix and retry. |
| `503 Stripe not configured` | Prod is misconfigured. | Verify `STRIPE_SECRET_KEY` env var on Railway; escalate. |
| 200 response from endpoint, but the refund log shows "MANUAL FOLLOW-UP REQUIRED" | The Stripe refund succeeded but the worker transfer reversal failed. | Open the Stripe dashboard, find the transfer in the `mission_<id>` transfer group, and manually create the reversal. The invoice is already marked REFUNDED — do not retry the endpoint. |

## Post-mortem

Every use of this runbook should produce a short internal note (Notion page, Slack thread) with: invoice ID, refund ID, reason, whether the worker kept their payout, user notification timestamp. This is the audit trail you will need if CAI or a tax auditor asks six months later why money moved.

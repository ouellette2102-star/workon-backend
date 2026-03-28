# Stripe Connect Express -- Activation Guide

**WorkOn Platform**
**Date:** 2026-03-27
**Status:** NOT YET ACTIVATED

---

## Prerequisites

- Stripe account: `acct_1SWIWDCm3RnXcbKH` (live)
- Stripe dashboard access with admin permissions
- WorkOn branding assets (logo, colors)
- Backend webhook already registered at:
  `https://workon-backend-production-8908.up.railway.app/api/v1/webhooks/stripe`

---

## Step-by-Step Activation

### Step 1: Open Stripe Connect Settings

1. Go to **https://dashboard.stripe.com/settings/connect**
2. Log in with the WorkOn Stripe account owner credentials
3. You will see the Connect configuration page

### Step 2: Enable Express Accounts

1. Under **Account types**, click **Get started** or **Configure** next to **Express**
2. Select **Express** as the account type for your connected accounts
3. This is the recommended type for WorkOn because:
   - Stripe handles onboarding, identity verification, and compliance
   - Workers get a Stripe-hosted dashboard for payouts
   - Minimal integration complexity on our side

### Step 3: Select Account Configuration

1. Under **Country availability**, ensure **Canada** is enabled (primary market)
2. Under **Business type**, select **Individual** (workers are individual contractors)
3. Optionally also enable **Company** for future enterprise workers
4. Under **Information requirements**, keep Stripe defaults for Canada

### Step 4: Enable Required Capabilities

Enable the following capabilities for connected accounts:

| Capability | Required | Purpose |
|------------|----------|---------|
| `card_payments` | YES | Workers can receive card payments from employers |
| `transfers` | YES | Platform can transfer funds to worker accounts |

To enable:
1. Go to **Capabilities** section
2. Check **Card payments**
3. Check **Transfers**
4. Save changes

### Step 5: Set Branding

1. Go to **Branding** section in Connect settings
2. Upload the **WorkOn logo** (square, min 128x128px)
3. Set **Brand color** to WorkOn primary: `#2563EB` (blue)
4. Set **Accent color**: `#10B981` (green)
5. Set **Business name**: `WorkOn`
6. Set **Support email**: `support@workon.app`
7. Set **Support phone**: (your support number)
8. Set **Privacy policy URL**: `https://workon.ca/privacy`
9. Set **Terms of service URL**: `https://workon.ca/terms`

### Step 6: Set Redirect URLs

Configure the OAuth/onboarding redirect URLs:

| Field | URL |
|-------|-----|
| **Onboarding redirect** | `https://workon.ca/onboarding/stripe/complete` |
| **Refresh URL** | `https://workon.ca/onboarding/stripe/refresh` |
| **Return URL** | `https://workon.ca/dashboard` |

For development/testing, also add:
- `http://localhost:3000/onboarding/stripe/complete`
- `http://localhost:3000/onboarding/stripe/refresh`

### Step 7: Configure Payout Settings

1. Under **Payouts**, set payout schedule:
   - **Payout frequency**: Daily (automatic)
   - **Minimum payout**: $1.00 CAD
2. Under **Commission**, configure application fees:
   - WorkOn takes **12% platform fee** (coded as `PLATFORM_FEE_PERCENT = 0.12`)
   - This is applied via `application_fee_amount` on PaymentIntents

### Step 8: Test with Test Mode First

**CRITICAL: Test before going live.**

1. Toggle to **Test mode** in the Stripe dashboard (top-right switch)
2. Create a test Express account:
   - Use Stripe CLI: `stripe connect accounts create --type express --country CA`
   - Or use the API with test keys
3. Complete the test onboarding flow using Stripe's test data:
   - Use test SSN: `000-000-000`
   - Use test bank account: `000123456789` with transit `12345`
4. Verify the following work end-to-end:
   - [ ] Worker onboarding link generation (`createConnectOnboardingLink`)
   - [ ] Onboarding completion callback
   - [ ] PaymentIntent creation with `transfer_data.destination`
   - [ ] Application fee deduction (12%)
   - [ ] Payout to connected account
5. Check webhook events are received:
   - `account.updated` (onboarding status changes)
   - `payment_intent.succeeded` (with transfer)
   - `transfer.created`

### Step 9: Go Live

1. Switch back to **Live mode**
2. Verify all settings match test mode configuration
3. Deploy backend code changes (uncomment Stripe Connect lines in `stripe.service.ts`)
4. Monitor first real worker onboarding

---

## Backend Code Changes Required

After activation, uncomment the Connect code in `src/stripe/stripe.service.ts`:

```typescript
// In createPaymentIntent(), uncomment:
application_fee_amount: Math.ceil(amountCents * this.PLATFORM_FEE_PERCENT),
transfer_data: {
  destination: workerStripeAccountId,
},
```

Also implement:
1. `createConnectOnboardingLink()` -- currently a stub throwing an error
2. `checkOnboardingStatus()` -- currently returns hardcoded false
3. Add `stripeAccountId` and `stripeOnboarded` fields to User/LocalUser models

---

## Webhook Events to Enable for Connect

Add these events to the existing webhook endpoint:

| Event | Purpose |
|-------|---------|
| `account.updated` | Track worker onboarding status changes |
| `transfer.created` | Confirm funds transferred to worker |
| `transfer.failed` | Alert on failed worker payouts |
| `payout.paid` | Confirm worker received bank deposit |
| `payout.failed` | Alert on failed bank deposits |

---

## Verification Checklist

- [ ] Express accounts enabled in Stripe dashboard
- [ ] Canada enabled as supported country
- [ ] Individual business type selected
- [ ] `card_payments` capability enabled
- [ ] `transfers` capability enabled
- [ ] Branding configured (logo, colors, URLs)
- [ ] Redirect URLs set (production + dev)
- [ ] Test mode onboarding completed successfully
- [ ] Test payment with transfer executed
- [ ] Application fee correctly deducted (12%)
- [ ] Webhook events firing for Connect events
- [ ] Backend code updated to use Connect
- [ ] Live mode verified with first real worker

---

## Support References

- Stripe Connect Express docs: https://docs.stripe.com/connect/express-accounts
- Stripe Connect onboarding: https://docs.stripe.com/connect/express-accounts#onboarding
- Application fees: https://docs.stripe.com/connect/direct-charges#application-fees
- Canada-specific requirements: https://docs.stripe.com/connect/required-verification-information

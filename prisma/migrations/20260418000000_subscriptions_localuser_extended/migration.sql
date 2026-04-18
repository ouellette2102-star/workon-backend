-- Phase 1 monétisation — extend Subscription model:
-- 1. Switch FK subscriptions.userId from users(legacy) to local_users
-- 2. Add Stripe-related columns (customer id, period end, canceled at)
-- 3. Extend SubscriptionPlan + SubscriptionStatus enums
-- 4. Add subscription_events audit table (Stripe idempotency)
--
-- Safe: subscriptions table has no row in prod (confirmed — no code
-- path reads or writes it yet). Re-targeting the FK is idempotent.

-- ─── Drop old FK to legacy users table ────────────────────────────
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_userId_fkey";

-- ─── Add Stripe columns (nullable — populated via webhooks) ────────
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- ─── Extend SubscriptionPlan enum ─────────────────────────────────
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'CLIENT_PRO';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'WORKER_PRO';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'CLIENT_BUSINESS';

-- ─── Extend SubscriptionStatus enum ───────────────────────────────
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';

-- ─── Recreate FK → local_users ────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "local_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── New table: subscription_events (Stripe webhook idempotency) ──
CREATE TABLE IF NOT EXISTS "subscription_events" (
  "id"              TEXT PRIMARY KEY,
  "subscriptionId"  TEXT NOT NULL,
  "stripeEventId"   TEXT NOT NULL UNIQUE,
  "type"            TEXT NOT NULL,
  "processedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload"         JSONB NOT NULL,
  CONSTRAINT "subscription_events_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "subscription_events_subscriptionId_idx" ON "subscription_events"("subscriptionId");

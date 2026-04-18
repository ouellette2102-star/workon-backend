-- Phase 3: Boosts — one-shot paid visibility and urgency upgrades.
--
-- Products (created in Stripe via API, matching env vars):
--   URGENT_9           $9 CAD  — mission urgent 24h + push to nearby
--   TOP_48H_14         $14 CAD — top of map/swipe stack for 48h
--   VERIFY_EXPRESS_19  $19 CAD — ID verification reviewed within 24h

-- ─── 1. Enum types ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "BoostType" AS ENUM ('URGENT_9', 'TOP_48H_14', 'VERIFY_EXPRESS_19');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BoostStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Extend local_missions with boost state flags ──────────────
ALTER TABLE "local_missions" ADD COLUMN IF NOT EXISTS "boostedUntil" TIMESTAMP(3);
ALTER TABLE "local_missions" ADD COLUMN IF NOT EXISTS "isUrgent"     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "local_missions" ADD COLUMN IF NOT EXISTS "urgentUntil"  TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "local_missions_boostedUntil_idx" ON "local_missions"("boostedUntil");
CREATE INDEX IF NOT EXISTS "local_missions_isUrgent_urgentUntil_idx" ON "local_missions"("isUrgent", "urgentUntil");

-- ─── 3. boosts audit table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "boosts" (
  "id"                    TEXT PRIMARY KEY,
  "userId"                TEXT NOT NULL,
  "missionId"             TEXT,
  "type"                  "BoostType" NOT NULL,
  "amountCents"           INT NOT NULL,
  "currency"              TEXT NOT NULL DEFAULT 'CAD',
  "stripePaymentIntentId" TEXT NOT NULL UNIQUE,
  "status"                "BoostStatus" NOT NULL DEFAULT 'PENDING',
  "appliedAt"             TIMESTAMP(3),
  "expiresAt"             TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "boosts_missionId_fkey"
    FOREIGN KEY ("missionId") REFERENCES "local_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "boosts_userId_idx" ON "boosts"("userId");
CREATE INDEX IF NOT EXISTS "boosts_missionId_idx" ON "boosts"("missionId");
CREATE INDEX IF NOT EXISTS "boosts_status_idx" ON "boosts"("status");
CREATE INDEX IF NOT EXISTS "boosts_type_idx" ON "boosts"("type");

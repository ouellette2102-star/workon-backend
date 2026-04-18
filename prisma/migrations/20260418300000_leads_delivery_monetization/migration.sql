-- Phase 4: Leads monétisés — dispatch de leads aux abonnés + quota mensuel.
--
-- Design:
--   - Nouvelle table `lead_deliveries` = one row per (lead, subscriber),
--     tracks opens, acceptances, conversions.
--   - `leads` étendu avec géoloc + categoryId + budgetCents pour le
--     dispatch ciblé aux abonnés dans la bonne zone/catégorie.
--   - Quotas enforced côté service (FREE=0, PRO=5/mo, BUSINESS=illimité).

-- ─── 1. Extend leads ──────────────────────────────────────────────
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "latitude"             DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "longitude"            DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "categoryId"           TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "budgetCents"          INTEGER;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "convertedToMissionId" TEXT;

DO $$ BEGIN
  CREATE UNIQUE INDEX "leads_convertedToMissionId_key" ON "leads"("convertedToMissionId") WHERE "convertedToMissionId" IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "leads_categoryId_idx" ON "leads"("categoryId");
CREATE INDEX IF NOT EXISTS "leads_latitude_longitude_idx" ON "leads"("latitude", "longitude");

-- ─── 2. lead_deliveries table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lead_deliveries" (
  "id"                    TEXT PRIMARY KEY,
  "leadId"                TEXT NOT NULL,
  "deliveredToUserId"     TEXT NOT NULL,
  "deliveredAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openedAt"              TIMESTAMP(3),
  "acceptedAt"            TIMESTAMP(3),
  "declinedAt"            TIMESTAMP(3),
  "convertedToMissionId"  TEXT,
  CONSTRAINT "lead_deliveries_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE,
  CONSTRAINT "lead_deliveries_deliveredToUserId_fkey"
    FOREIGN KEY ("deliveredToUserId") REFERENCES "local_users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_deliveries_leadId_deliveredToUserId_key"
  ON "lead_deliveries"("leadId", "deliveredToUserId");
CREATE INDEX IF NOT EXISTS "lead_deliveries_deliveredToUserId_idx" ON "lead_deliveries"("deliveredToUserId");
CREATE INDEX IF NOT EXISTS "lead_deliveries_leadId_idx" ON "lead_deliveries"("leadId");
CREATE INDEX IF NOT EXISTS "lead_deliveries_deliveredAt_idx" ON "lead_deliveries"("deliveredAt");

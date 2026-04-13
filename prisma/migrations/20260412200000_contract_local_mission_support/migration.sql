-- Contract LocalMission support (fully idempotent)
-- Safe to run multiple times — every statement uses IF NOT EXISTS or DO $$ blocks.

-- Make original FKs optional (idempotent: DROP NOT NULL is a no-op if already nullable)
ALTER TABLE "contracts" ALTER COLUMN "missionId" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "employerId" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "workerId" DROP NOT NULL;

-- Add columns (idempotent)
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "localEmployerId" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "localWorkerId" TEXT;

-- Unique index on localMissionId (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_localMissionId_key" ON "contracts"("localMissionId");

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "contracts_localEmployerId_idx" ON "contracts"("localEmployerId");
CREATE INDEX IF NOT EXISTS "contracts_localWorkerId_idx" ON "contracts"("localWorkerId");

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localEmployerId_fkey"
    FOREIGN KEY ("localEmployerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localWorkerId_fkey"
    FOREIGN KEY ("localWorkerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop old non-unique index (idempotent)
DROP INDEX IF EXISTS "contracts_localMissionId_idx";

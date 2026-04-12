-- AlterTable: Make missionId, employerId, workerId optional for local contract support
ALTER TABLE "contracts" ALTER COLUMN "missionId" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "employerId" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "workerId" DROP NOT NULL;

-- Add localEmployerId and localWorkerId columns (idempotent — may already exist from 20260406000000)
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "localEmployerId" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "localWorkerId" TEXT;

-- Make localMissionId unique (one contract per local mission)
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_localMissionId_key" ON "contracts"("localMissionId");

-- Add indexes for local user lookups (idempotent)
CREATE INDEX IF NOT EXISTS "contracts_localEmployerId_idx" ON "contracts"("localEmployerId");
CREATE INDEX IF NOT EXISTS "contracts_localWorkerId_idx" ON "contracts"("localWorkerId");

-- Add foreign keys for local users (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localEmployerId_fkey" FOREIGN KEY ("localEmployerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localWorkerId_fkey" FOREIGN KEY ("localWorkerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop the existing non-unique index on localMissionId (replaced by unique)
DROP INDEX IF EXISTS "contracts_localMissionId_idx";

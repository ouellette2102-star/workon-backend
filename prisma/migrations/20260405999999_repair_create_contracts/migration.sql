-- Repair migration: contracts table was missing in production despite
-- 20251202201222_add_messages_contracts being marked as applied.
-- Idempotent: no-op on databases where contracts already exists.

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: contracts (idempotent)
CREATE TABLE IF NOT EXISTS "contracts" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "signedByWorker" BOOLEAN NOT NULL DEFAULT false,
    "signedByEmployer" BOOLEAN NOT NULL DEFAULT false,
    "signatureNonce" TEXT,
    "contractUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_missionId_key" ON "contracts"("missionId");
CREATE INDEX IF NOT EXISTS "contracts_employerId_idx" ON "contracts"("employerId");
CREATE INDEX IF NOT EXISTS "contracts_workerId_idx" ON "contracts"("workerId");
CREATE INDEX IF NOT EXISTS "contracts_status_idx" ON "contracts"("status");

-- AddForeignKey (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

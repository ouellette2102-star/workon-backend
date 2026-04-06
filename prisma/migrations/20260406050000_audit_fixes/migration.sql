-- Audit fixes: insurance verification fields on LocalUser, platformFeePct default change

-- Insurance verification fields
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceVerifiedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceProofUrl" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceExpiresAt" TIMESTAMP(3);

-- Update platformFeePct default from 10 to 15
ALTER TABLE "payments" ALTER COLUMN "platformFeePct" SET DEFAULT 15;

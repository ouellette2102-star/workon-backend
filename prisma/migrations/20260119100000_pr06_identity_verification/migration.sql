-- PR-06: Identity Verification Hooks
-- Safe migration: All changes are additive (ADD COLUMN, CREATE TYPE)
-- No data loss risk

-- CreateEnum: IdVerificationStatus
CREATE TYPE "IdVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum: TrustTier
CREATE TYPE "TrustTier" AS ENUM ('BASIC', 'VERIFIED', 'TRUSTED', 'PREMIUM');

-- AlterTable: Add verification columns to local_users
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "idVerificationStatus" "IdVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "idVerifiedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "idVerificationProvider" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "idVerificationRef" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "bankVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "bankVerifiedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "trustTier" "TrustTier" NOT NULL DEFAULT 'BASIC';
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "trustTierUpdatedAt" TIMESTAMP(3);

-- CreateIndex: Performance indexes for verification queries
CREATE INDEX IF NOT EXISTS "local_users_trustTier_idx" ON "local_users"("trustTier");
CREATE INDEX IF NOT EXISTS "local_users_phoneVerified_idx" ON "local_users"("phoneVerified");
CREATE INDEX IF NOT EXISTS "local_users_idVerificationStatus_idx" ON "local_users"("idVerificationStatus");


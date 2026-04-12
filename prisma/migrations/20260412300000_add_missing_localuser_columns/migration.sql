-- Add missing LocalUser columns and fix type mismatches (schema drift fix)
-- These fields exist in schema.prisma but had no corresponding migration,
-- or were created with wrong types (INTEGER instead of DOUBLE PRECISION).

-- New columns (idempotent)
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "completionScore" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceVerified" BOOLEAN DEFAULT false;

-- Fix type mismatches: migration 20260403000000 created these as INTEGER,
-- but Prisma schema declares Float (DOUBLE PRECISION). This causes 22P03
-- "incorrect binary data format" when Prisma sends binary float data.
ALTER TABLE "local_users" ALTER COLUMN "serviceRadiusKm" TYPE DOUBLE PRECISION USING "serviceRadiusKm"::DOUBLE PRECISION;
ALTER TABLE "local_users" ALTER COLUMN "completionScore" TYPE DOUBLE PRECISION USING "completionScore"::DOUBLE PRECISION;

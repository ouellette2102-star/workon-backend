-- Add missing LocalUser columns (schema drift fix)
-- These fields exist in schema.prisma but had no corresponding migration.

ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "completionScore" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceVerified" BOOLEAN DEFAULT false;

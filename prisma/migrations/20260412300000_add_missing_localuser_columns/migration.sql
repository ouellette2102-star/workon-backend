-- LocalUser schema reconciliation (fully idempotent)
-- Adds missing columns AND fixes type mismatches from earlier migrations.
-- Safe to run on any state of the local_users table.

-- ── Missing columns ──
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "completionScore" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "insuranceVerified" BOOLEAN DEFAULT false;

-- ── Type fixes ──
-- Migration 20260403000000 created serviceRadiusKm/completionScore as INTEGER.
-- Prisma schema declares Float (= DOUBLE PRECISION).
-- Sending binary float data to an INTEGER column causes PostgreSQL error 22P03.
ALTER TABLE "local_users" ALTER COLUMN "serviceRadiusKm" TYPE DOUBLE PRECISION USING "serviceRadiusKm"::DOUBLE PRECISION;
ALTER TABLE "local_users" ALTER COLUMN "completionScore" TYPE DOUBLE PRECISION USING "completionScore"::DOUBLE PRECISION;

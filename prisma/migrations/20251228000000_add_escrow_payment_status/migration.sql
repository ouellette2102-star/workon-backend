-- Migration: add_escrow_payment_status
-- Description: Add escrow-related payment statuses and idempotency field

-- Add new enum values to PaymentStatus
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CAPTURED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- Add lastStripeEventId for webhook idempotency
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "lastStripeEventId" TEXT;

-- Make missionId unique (one payment per mission for escrow)
-- Note: This may fail if duplicates exist - handle manually if needed
CREATE UNIQUE INDEX IF NOT EXISTS "payments_missionId_key" ON "payments"("missionId");


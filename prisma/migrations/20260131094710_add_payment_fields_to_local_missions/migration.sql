-- AlterTable: Add payment fields to local_missions
-- These fields were added to schema.prisma (PR-6) but migration was never created

ALTER TABLE "local_missions" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "local_missions" ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateIndex: Index for payment intent lookups
CREATE INDEX "local_missions_stripePaymentIntentId_idx" ON "local_missions"("stripePaymentIntentId");

-- Worker Payout tracking model
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED');

CREATE TABLE "payouts" (
  "id" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "stripeTransferId" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "missionId" TEXT,
  "paymentId" TEXT,
  "failureReason" TEXT,
  "arrivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payouts_stripeTransferId_key" ON "payouts"("stripeTransferId");
CREATE INDEX "idx_payouts_workerId" ON "payouts"("workerId");
CREATE INDEX "idx_payouts_status" ON "payouts"("status");
CREATE INDEX "idx_payouts_missionId" ON "payouts"("missionId");

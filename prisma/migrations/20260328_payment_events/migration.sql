-- Payment event sourcing for audit trail
CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "stripeEventId" TEXT,
  "previousStatus" TEXT,
  "newStatus" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_events_stripeEventId_key" ON "payment_events"("stripeEventId");
CREATE INDEX "idx_payment_events_paymentId" ON "payment_events"("paymentId");
CREATE INDEX "idx_payment_events_eventType" ON "payment_events"("eventType");

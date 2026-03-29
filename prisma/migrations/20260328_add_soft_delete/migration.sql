-- Add soft-delete column to reviews, payments, and contracts tables

ALTER TABLE "reviews" ADD COLUMN "deletedAt" TIMESTAMP;
ALTER TABLE "payments" ADD COLUMN "deletedAt" TIMESTAMP;
ALTER TABLE "contracts" ADD COLUMN "deletedAt" TIMESTAMP;

-- Create indexes on deletedAt for efficient soft-delete filtering
CREATE INDEX "idx_reviews_deletedAt" ON "reviews" ("deletedAt");
CREATE INDEX "idx_payments_deletedAt" ON "payments" ("deletedAt");
CREATE INDEX "idx_contracts_deletedAt" ON "contracts" ("deletedAt");

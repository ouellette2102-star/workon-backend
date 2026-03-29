-- Standardize all money amounts from Float (dollars) to Int (cents)
-- This migration converts existing dollar values to cents and renames columns

-- LocalMission: price (dollars) → price_cents (cents)
ALTER TABLE "local_missions" ADD COLUMN "price_cents" INTEGER;
UPDATE "local_missions" SET "price_cents" = ROUND("price" * 100)::INTEGER;
ALTER TABLE "local_missions" ALTER COLUMN "price_cents" SET NOT NULL;
ALTER TABLE "local_missions" DROP COLUMN "price";

-- LocalOffer: price (dollars) → price_cents (cents)
ALTER TABLE "local_offers" ADD COLUMN "price_cents" INTEGER;
UPDATE "local_offers" SET "price_cents" = ROUND("price" * 100)::INTEGER;
ALTER TABLE "local_offers" ALTER COLUMN "price_cents" SET NOT NULL;
ALTER TABLE "local_offers" DROP COLUMN "price";

-- Mission: budgetMin/budgetMax (dollars) → budget_min_cents/budget_max_cents (cents)
ALTER TABLE "missions" ADD COLUMN "budget_min_cents" INTEGER;
ALTER TABLE "missions" ADD COLUMN "budget_max_cents" INTEGER;
UPDATE "missions" SET "budget_min_cents" = ROUND("budgetMin" * 100)::INTEGER, "budget_max_cents" = ROUND("budgetMax" * 100)::INTEGER;
ALTER TABLE "missions" ALTER COLUMN "budget_min_cents" SET NOT NULL;
ALTER TABLE "missions" ALTER COLUMN "budget_max_cents" SET NOT NULL;
ALTER TABLE "missions" DROP COLUMN "budgetMin";
ALTER TABLE "missions" DROP COLUMN "budgetMax";

-- Offer: proposedRate (dollars) → proposed_rate_cents (cents)
ALTER TABLE "offers" ADD COLUMN "proposed_rate_cents" INTEGER;
UPDATE "offers" SET "proposed_rate_cents" = ROUND("proposedRate" * 100)::INTEGER;
ALTER TABLE "offers" ALTER COLUMN "proposed_rate_cents" SET NOT NULL;
ALTER TABLE "offers" DROP COLUMN "proposedRate";

-- Payment: amount (dollars) → amount_cents (cents), platformFeePct Float → Int
ALTER TABLE "payments" ADD COLUMN "amount_cents" INTEGER;
UPDATE "payments" SET "amount_cents" = ROUND("amount" * 100)::INTEGER;
ALTER TABLE "payments" ALTER COLUMN "amount_cents" SET NOT NULL;
ALTER TABLE "payments" DROP COLUMN "amount";
ALTER TABLE "payments" ADD COLUMN "platform_fee_pct" INTEGER DEFAULT 10;
UPDATE "payments" SET "platform_fee_pct" = ROUND("platformFeePct")::INTEGER;
ALTER TABLE "payments" ALTER COLUMN "platform_fee_pct" SET NOT NULL;
ALTER TABLE "payments" DROP COLUMN "platformFeePct";

-- WorkerProfile: hourlyRate → hourly_rate_cents, totalEarnings → total_earnings_cents
ALTER TABLE "worker_profiles" ADD COLUMN "hourly_rate_cents" INTEGER DEFAULT 0;
UPDATE "worker_profiles" SET "hourly_rate_cents" = ROUND("hourlyRate" * 100)::INTEGER;
ALTER TABLE "worker_profiles" ALTER COLUMN "hourly_rate_cents" SET NOT NULL;
ALTER TABLE "worker_profiles" DROP COLUMN "hourlyRate";

ALTER TABLE "worker_profiles" ADD COLUMN "total_earnings_cents" INTEGER DEFAULT 0;
UPDATE "worker_profiles" SET "total_earnings_cents" = ROUND("totalEarnings" * 100)::INTEGER;
ALTER TABLE "worker_profiles" ALTER COLUMN "total_earnings_cents" SET NOT NULL;
ALTER TABLE "worker_profiles" DROP COLUMN "totalEarnings";

-- Contract: amount → amount_cents, hourlyRate → hourly_rate_cents
ALTER TABLE "contracts" ADD COLUMN "amount_cents" INTEGER;
UPDATE "contracts" SET "amount_cents" = ROUND("amount" * 100)::INTEGER;
ALTER TABLE "contracts" ALTER COLUMN "amount_cents" SET NOT NULL;
ALTER TABLE "contracts" DROP COLUMN "amount";

ALTER TABLE "contracts" ADD COLUMN "hourly_rate_cents" INTEGER;
UPDATE "contracts" SET "hourly_rate_cents" = ROUND("hourlyRate" * 100)::INTEGER WHERE "hourlyRate" IS NOT NULL;
ALTER TABLE "contracts" DROP COLUMN "hourlyRate";

-- RecurringMissionTemplate: price → price_cents
ALTER TABLE "recurring_mission_templates" ADD COLUMN "price_cents" INTEGER;
UPDATE "recurring_mission_templates" SET "price_cents" = ROUND("price" * 100)::INTEGER;
ALTER TABLE "recurring_mission_templates" ALTER COLUMN "price_cents" SET NOT NULL;
ALTER TABLE "recurring_mission_templates" DROP COLUMN "price";

-- Booking: price → price_cents
ALTER TABLE "bookings" ADD COLUMN "price_cents" INTEGER;
UPDATE "bookings" SET "price_cents" = ROUND("price" * 100)::INTEGER;
ALTER TABLE "bookings" ALTER COLUMN "price_cents" SET NOT NULL;
ALTER TABLE "bookings" DROP COLUMN "price";

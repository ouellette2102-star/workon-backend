-- RenamePaymentAmountToCents
-- Converts amount (Float, dollars) to amountCents (Int, cents) for financial safety.
-- Also updates platformFeePct default from 10 to 15.

-- Step 1: Rename column
ALTER TABLE "payments" RENAME COLUMN "amount" TO "amountCents";

-- Step 2: Convert existing dollar values to cents and change type to INTEGER
ALTER TABLE "payments" ALTER COLUMN "amountCents" TYPE INTEGER USING ROUND("amountCents" * 100)::INTEGER;

-- Step 3: Update default for platformFeePct
ALTER TABLE "payments" ALTER COLUMN "platformFeePct" SET DEFAULT 15;

-- Add employer-specific business info to LocalUser.
-- All fields nullable so existing rows need no backfill — employers created
-- before this migration will surface as "onboarding incomplete" until they
-- visit /onboarding/employer. `onboardingCompletedAt` is the single source
-- of truth: flipped when the employer submits the onboarding form, read by
-- guards on /missions/new and /missions-local/create endpoints.

ALTER TABLE "local_users"
  ADD COLUMN IF NOT EXISTS "businessName" TEXT,
  ADD COLUMN IF NOT EXISTS "businessCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "businessDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "businessWebsite" TEXT,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Add hourlyRate + jobTitle to LocalUser for worker display.
-- Both nullable so existing rows don't need a backfill; the FE renders
-- conditionally on truthy values ("À partir de X $/h" only when set).

ALTER TABLE "local_users"
  ADD COLUMN IF NOT EXISTS "hourlyRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;

-- Add location fields to recurring_mission_templates so generated
-- LocalMissions inherit coordinates instead of being stuck at (0,0).
ALTER TABLE "recurring_mission_templates"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "address" TEXT;

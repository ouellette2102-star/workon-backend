-- Fix swipe table column names to match Prisma schema
-- Migration created swiperId/candidateId but schema expects userId/targetId
-- Migration created userId1/userId2 but schema expects userAId/userBId

-- ── swipe_actions ──
ALTER TABLE "swipe_actions" RENAME COLUMN "swiperId" TO "userId";
ALTER TABLE "swipe_actions" RENAME COLUMN "candidateId" TO "targetId";

-- Drop the old action enum type constraint and use plain string
-- (Prisma schema declares action as String, not enum)
ALTER TABLE "swipe_actions" ALTER COLUMN "action" TYPE TEXT USING "action"::TEXT;

-- ── swipe_matches ──
ALTER TABLE "swipe_matches" RENAME COLUMN "userId1" TO "userAId";
ALTER TABLE "swipe_matches" RENAME COLUMN "userId2" TO "userBId";

-- Add missing columns
ALTER TABLE "swipe_matches" ADD COLUMN IF NOT EXISTS "missionId" TEXT;
ALTER TABLE "swipe_matches" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Change status from enum to plain text (Prisma schema declares String)
ALTER TABLE "swipe_matches" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "swipe_matches" ALTER COLUMN "status" SET DEFAULT 'active';

-- Update existing enum values to lowercase (schema uses lowercase)
UPDATE "swipe_matches" SET "status" = lower("status") WHERE "status" != lower("status");

-- Recreate unique constraints with new column names
DROP INDEX IF EXISTS "swipe_actions_swiperId_candidateId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "swipe_actions_userId_targetId_key" ON "swipe_actions"("userId", "targetId");

DROP INDEX IF EXISTS "swipe_matches_userId1_userId2_key";
CREATE UNIQUE INDEX IF NOT EXISTS "swipe_matches_userAId_userBId_key" ON "swipe_matches"("userAId", "userBId");

-- Recreate indexes with new column names
DROP INDEX IF EXISTS "swipe_actions_swiperId_idx";
DROP INDEX IF EXISTS "swipe_actions_candidateId_idx";
CREATE INDEX IF NOT EXISTS "swipe_actions_userId_idx" ON "swipe_actions"("userId");
CREATE INDEX IF NOT EXISTS "swipe_actions_targetId_idx" ON "swipe_actions"("targetId");

DROP INDEX IF EXISTS "swipe_matches_userId1_idx";
DROP INDEX IF EXISTS "swipe_matches_userId2_idx";
CREATE INDEX IF NOT EXISTS "swipe_matches_userAId_idx" ON "swipe_matches"("userAId");
CREATE INDEX IF NOT EXISTS "swipe_matches_userBId_idx" ON "swipe_matches"("userBId");

-- Fix foreign key constraints
ALTER TABLE "swipe_actions" DROP CONSTRAINT IF EXISTS "swipe_actions_swiperId_fkey";
ALTER TABLE "swipe_actions" DROP CONSTRAINT IF EXISTS "swipe_actions_candidateId_fkey";

DO $$ BEGIN
  ALTER TABLE "swipe_actions" ADD CONSTRAINT "swipe_actions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "swipe_matches" DROP CONSTRAINT IF EXISTS "swipe_matches_userId1_fkey";
ALTER TABLE "swipe_matches" DROP CONSTRAINT IF EXISTS "swipe_matches_userId2_fkey";

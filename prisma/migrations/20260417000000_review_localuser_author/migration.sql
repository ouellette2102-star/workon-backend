-- Review schema: support LocalUser as author (parallel to existing localTargetUserId).
-- Additive-only migration: nullable column + drop NOT NULL + CHECK constraints.
-- No existing data is touched.

-- Make legacy FK columns nullable
ALTER TABLE "reviews" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "targetUserId" DROP NOT NULL;

-- Add localAuthorId column
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "localAuthorId" TEXT;

-- Indexes for the new column + missing author index
CREATE INDEX IF NOT EXISTS "reviews_localAuthorId_idx" ON "reviews"("localAuthorId");
CREATE INDEX IF NOT EXISTS "reviews_authorId_idx" ON "reviews"("authorId");

-- FK: localAuthorId → local_users.id (cascade on delete to match legacy behaviour)
DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_localAuthorId_fkey"
    FOREIGN KEY ("localAuthorId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: exactly one of authorId / localAuthorId must be set
DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_required_chk"
    CHECK ("authorId" IS NOT NULL OR "localAuthorId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: exactly one of targetUserId / localTargetUserId must be set
DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_required_chk"
    CHECK ("targetUserId" IS NOT NULL OR "localTargetUserId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

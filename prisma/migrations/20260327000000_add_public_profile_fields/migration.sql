-- AddPublicProfileFields: slug, bio, ratingAvg, ratingCount + UTM/click attribution

ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "slug"        TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "bio"         TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "ratingAvg"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER          NOT NULL DEFAULT 0;

-- UTM & click-ID attribution tracking
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "gclid"       TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "fbclid"      TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "ttclid"      TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "utmSource"   TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;

-- Unique constraint on slug (for /p/[slug] public profiles)
ALTER TABLE "local_users" ADD CONSTRAINT "local_users_slug_key" UNIQUE ("slug");

-- Indexes for public API queries
CREATE INDEX IF NOT EXISTS "local_users_slug_idx"      ON "local_users"("slug");
CREATE INDEX IF NOT EXISTS "local_users_ratingAvg_idx" ON "local_users"("ratingAvg");

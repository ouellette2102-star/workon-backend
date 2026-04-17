-- Review.missionId was FK → Mission(legacy). Reviews tied to LocalMission
-- crashed with P2003 (FK constraint violation on reviews_missionId_fkey).
-- Add localMissionId parallel column, same dual-FK pattern as author/target.

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "localMissionId" TEXT;

CREATE INDEX IF NOT EXISTS "reviews_localMissionId_idx" ON "reviews"("localMissionId");

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_localMissionId_fkey"
    FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

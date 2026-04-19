-- Make missionId nullable (was NOT NULL)
ALTER TABLE "mission_photos" ALTER COLUMN "missionId" DROP NOT NULL;

-- Add localMissionId FK to local_missions
ALTER TABLE "mission_photos" ADD COLUMN "localMissionId" TEXT;

ALTER TABLE "mission_photos" ADD CONSTRAINT "mission_photos_localMissionId_fkey"
  FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "mission_photos_localMissionId_idx" ON "mission_photos"("localMissionId");

-- Make missionId optional (was required @unique)
ALTER TABLE "disputes" ALTER COLUMN "missionId" DROP NOT NULL;

-- Add LocalMission and LocalUser support to Dispute
ALTER TABLE "disputes" ADD COLUMN "localMissionId" TEXT;
ALTER TABLE "disputes" ADD COLUMN "localOpenedById" TEXT;

-- Unique constraint on localMissionId (one dispute per local mission)
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_localMissionId_key" UNIQUE ("localMissionId");

-- Foreign keys
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_localMissionId_fkey" FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_localOpenedById_fkey" FOREIGN KEY ("localOpenedById") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX "disputes_localMissionId_idx" ON "disputes"("localMissionId");

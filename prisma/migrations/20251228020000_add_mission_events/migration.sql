-- CreateEnum
CREATE TYPE "MissionEventType" AS ENUM (
    'MISSION_CREATED',
    'MISSION_PUBLISHED',
    'MISSION_ACCEPTED',
    'MISSION_STARTED',
    'MISSION_COMPLETED',
    'MISSION_CANCELED',
    'MISSION_EXPIRED',
    'PAYMENT_AUTHORIZED',
    'PAYMENT_CAPTURED',
    'PAYMENT_CANCELED',
    'PHOTO_UPLOADED',
    'OFFER_SUBMITTED',
    'OFFER_ACCEPTED',
    'OFFER_DECLINED'
);

-- CreateTable
CREATE TABLE "mission_events" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" "MissionEventType" NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_events_missionId_createdAt_idx" ON "mission_events"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "mission_events_targetUserId_createdAt_idx" ON "mission_events"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "mission_events_type_createdAt_idx" ON "mission_events"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "mission_events" ADD CONSTRAINT "mission_events_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


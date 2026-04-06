-- Add LocalUser support to Review
ALTER TABLE "reviews" ADD COLUMN "localAuthorId" TEXT;
ALTER TABLE "reviews" ADD COLUMN "localTargetUserId" TEXT;
ALTER TABLE "reviews" ADD COLUMN "localMissionId" TEXT;

-- Add LocalUser support to Booking
ALTER TABLE "bookings" ADD COLUMN "localClientId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "localMissionId" TEXT;

-- Add LocalUser support to Contract
ALTER TABLE "contracts" ADD COLUMN "localMissionId" TEXT;
ALTER TABLE "contracts" ADD COLUMN "localEmployerId" TEXT;
ALTER TABLE "contracts" ADD COLUMN "localWorkerId" TEXT;

-- Foreign keys (all nullable, SET NULL on delete)
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_localAuthorId_fkey" FOREIGN KEY ("localAuthorId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_localTargetUserId_fkey" FOREIGN KEY ("localTargetUserId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_localMissionId_fkey" FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_localClientId_fkey" FOREIGN KEY ("localClientId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_localMissionId_fkey" FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localMissionId_fkey" FOREIGN KEY ("localMissionId") REFERENCES "local_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localEmployerId_fkey" FOREIGN KEY ("localEmployerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_localWorkerId_fkey" FOREIGN KEY ("localWorkerId") REFERENCES "local_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "reviews_localAuthorId_idx" ON "reviews"("localAuthorId");
CREATE INDEX "reviews_localTargetUserId_idx" ON "reviews"("localTargetUserId");
CREATE INDEX "bookings_localClientId_idx" ON "bookings"("localClientId");
CREATE INDEX "contracts_localMissionId_idx" ON "contracts"("localMissionId");

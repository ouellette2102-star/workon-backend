-- Add LocalUser support to Notification model
ALTER TABLE "notifications" ADD COLUMN "localUserId" TEXT;

-- FK to local_users
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index
CREATE INDEX "notifications_localUserId_idx" ON "notifications"("localUserId");

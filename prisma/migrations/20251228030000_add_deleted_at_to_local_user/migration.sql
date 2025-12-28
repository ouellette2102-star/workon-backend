-- Add deletedAt column for GDPR-compliant account deletion
ALTER TABLE "local_users" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create index for deletedAt (for filtering active users)
CREATE INDEX "local_users_deletedAt_idx" ON "local_users"("deletedAt");


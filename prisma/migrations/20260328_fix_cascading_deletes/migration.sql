-- Fix cascading deletes: use SetNull for historical references
-- This preserves reviews, disputes, messages, and contracts when a user is deleted

-- Review: author and target should be preserved (SetNull instead of Cascade)
ALTER TABLE "reviews" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "targetUserId" DROP NOT NULL;
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_authorId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_targetUserId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dispute: openedBy should be preserved
ALTER TABLE "disputes" ALTER COLUMN "openedById" DROP NOT NULL;
ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_openedById_fkey";
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Message: sender should be preserved (show "[deleted user]" in UI)
ALTER TABLE "messages" ALTER COLUMN "senderId" DROP NOT NULL;
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contract: employer and worker should be preserved (legal documents)
ALTER TABLE "contracts" ALTER COLUMN "employerId" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "workerId" DROP NOT NULL;
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_employerId_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_workerId_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

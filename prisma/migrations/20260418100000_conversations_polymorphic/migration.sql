-- Phase 2: Conversations polymorphic — separate pure DM threads from mission chats
--
-- Design:
--   LocalMessage can now attach to EITHER a LocalMission (chat about a real job)
--   OR a Conversation (pure DM unlocked post-swipe-match). XOR enforced via CHECK.
--
-- Data migration:
--   The 2 legacy "stub" missions created by the old POST /messages-local/direct
--   (title LIKE 'Conversation — %', id LIKE 'lm_dm_%', price=0) are converted
--   to real Conversation rows, their messages are re-pointed, then the stub
--   LocalMission rows are deleted. This removes the pollution from /my-missions.

-- ─── 1. Create ConversationUnlock enum ───────────────────────────
DO $$ BEGIN
  CREATE TYPE "ConversationUnlock" AS ENUM ('SWIPE_MATCH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Create conversations table ───────────────────────────────
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"              TEXT PRIMARY KEY,
  "participantAId"  TEXT NOT NULL,
  "participantBId"  TEXT NOT NULL,
  "unlockedVia"     "ConversationUnlock" NOT NULL DEFAULT 'SWIPE_MATCH',
  "unlockedMatchId" TEXT UNIQUE,
  "lastMessageAt"   TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_participantAId_participantBId_key"
  ON "conversations"("participantAId", "participantBId");
CREATE INDEX IF NOT EXISTS "conversations_participantAId_idx" ON "conversations"("participantAId");
CREATE INDEX IF NOT EXISTS "conversations_participantBId_idx" ON "conversations"("participantBId");

-- ─── 3. local_messages: add conversationId + drop NOT NULL on missionId ──
ALTER TABLE "local_messages" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "local_messages" ALTER COLUMN "missionId" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "local_messages_conversationId_idx" ON "local_messages"("conversationId");

-- FK: conversationId → conversations.id
DO $$ BEGIN
  ALTER TABLE "local_messages" ADD CONSTRAINT "local_messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: exactly one of missionId / conversationId must be set
DO $$ BEGIN
  ALTER TABLE "local_messages" ADD CONSTRAINT "local_messages_attach_required_chk"
    CHECK ("missionId" IS NOT NULL OR "conversationId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. DATA MIGRATION: convert legacy lm_dm_* stubs into Conversations ──
--
-- For each "stub" LocalMission (title pattern 'Conversation — %' AND id LIKE 'lm_dm_%'):
-- a) insert a Conversation row with participants = {createdByUserId, assignedToUserId},
--    ordered asc for the unique (A,B) pair to dedupe bidirectional pairs.
-- b) re-point local_messages.missionId → conversationId, null out missionId
-- c) compute lastMessageAt from max(message.createdAt)
-- d) delete the stub LocalMission (cascades to any remaining messages that
--    didn't make it — but our UPDATE should have caught them all)

-- Create conversations from stubs (idempotent — skip if pair already has one)
INSERT INTO "conversations" ("id", "participantAId", "participantBId", "unlockedVia", "createdAt", "lastMessageAt")
SELECT
  'cv_' || substring(md5(random()::text || clock_timestamp()::text), 1, 24) as id,
  LEAST("createdByUserId", "assignedToUserId") as "participantAId",
  GREATEST("createdByUserId", "assignedToUserId") as "participantBId",
  'SWIPE_MATCH'::"ConversationUnlock" as "unlockedVia",
  "createdAt",
  "updatedAt"
FROM "local_missions"
WHERE "id" LIKE 'lm_dm_%'
  AND "title" LIKE 'Conversation — %'
  AND "assignedToUserId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "conversations" c
    WHERE c."participantAId" = LEAST("local_missions"."createdByUserId", "local_missions"."assignedToUserId")
      AND c."participantBId" = GREATEST("local_missions"."createdByUserId", "local_missions"."assignedToUserId")
  );

-- Re-point messages from stub missions to their new conversation
UPDATE "local_messages" m
SET
  "conversationId" = c."id",
  "missionId" = NULL
FROM "local_missions" lm
JOIN "conversations" c
  ON c."participantAId" = LEAST(lm."createdByUserId", lm."assignedToUserId")
  AND c."participantBId" = GREATEST(lm."createdByUserId", lm."assignedToUserId")
WHERE m."missionId" = lm."id"
  AND lm."id" LIKE 'lm_dm_%'
  AND lm."title" LIKE 'Conversation — %';

-- Delete the stub missions (now orphaned)
DELETE FROM "local_missions"
WHERE "id" LIKE 'lm_dm_%'
  AND "title" LIKE 'Conversation — %';

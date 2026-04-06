-- Swipe Discovery System

-- SwipeActionType enum
CREATE TYPE "SwipeActionType" AS ENUM ('LIKE', 'PASS', 'SUPERLIKE');

-- SwipeMatchStatus enum
CREATE TYPE "SwipeMatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED');

-- SwipeAction table
CREATE TABLE "swipe_actions" (
    "id" TEXT NOT NULL,
    "swiperId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "action" "SwipeActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipe_actions_pkey" PRIMARY KEY ("id")
);

-- SwipeMatch table
CREATE TABLE "swipe_matches" (
    "id" TEXT NOT NULL,
    "userId1" TEXT NOT NULL,
    "userId2" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SwipeMatchStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "swipe_matches_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "swipe_actions_swiperId_candidateId_key" ON "swipe_actions"("swiperId", "candidateId");
CREATE UNIQUE INDEX "swipe_matches_userId1_userId2_key" ON "swipe_matches"("userId1", "userId2");

-- Indexes
CREATE INDEX "swipe_actions_swiperId_idx" ON "swipe_actions"("swiperId");
CREATE INDEX "swipe_actions_candidateId_idx" ON "swipe_actions"("candidateId");
CREATE INDEX "swipe_matches_userId1_idx" ON "swipe_matches"("userId1");
CREATE INDEX "swipe_matches_userId2_idx" ON "swipe_matches"("userId2");
CREATE INDEX "swipe_matches_status_idx" ON "swipe_matches"("status");

-- Foreign keys
ALTER TABLE "swipe_actions" ADD CONSTRAINT "swipe_actions_swiperId_fkey" FOREIGN KEY ("swiperId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swipe_actions" ADD CONSTRAINT "swipe_actions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swipe_matches" ADD CONSTRAINT "swipe_matches_userId1_fkey" FOREIGN KEY ("userId1") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swipe_matches" ADD CONSTRAINT "swipe_matches_userId2_fkey" FOREIGN KEY ("userId2") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

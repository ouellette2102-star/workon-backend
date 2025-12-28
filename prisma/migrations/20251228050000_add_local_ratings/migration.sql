-- CreateTable
CREATE TABLE "local_ratings" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_ratings_missionId_authorId_key" ON "local_ratings"("missionId", "authorId");

-- CreateIndex
CREATE INDEX "local_ratings_missionId_idx" ON "local_ratings"("missionId");

-- CreateIndex
CREATE INDEX "local_ratings_authorId_idx" ON "local_ratings"("authorId");

-- CreateIndex
CREATE INDEX "local_ratings_targetUserId_idx" ON "local_ratings"("targetUserId");

-- AddForeignKey
ALTER TABLE "local_ratings" ADD CONSTRAINT "local_ratings_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "local_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_ratings" ADD CONSTRAINT "local_ratings_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_ratings" ADD CONSTRAINT "local_ratings_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "LocalMessageRole" AS ENUM ('WORKER', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "LocalMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "local_messages" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "LocalMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "LocalMessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_messages_missionId_idx" ON "local_messages"("missionId");

-- CreateIndex
CREATE INDEX "local_messages_senderId_idx" ON "local_messages"("senderId");

-- CreateIndex
CREATE INDEX "local_messages_createdAt_idx" ON "local_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "local_messages" ADD CONSTRAINT "local_messages_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "local_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_messages" ADD CONSTRAINT "local_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

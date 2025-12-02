-- CreateEnum
CREATE TYPE "MessageSenderRole" AS ENUM ('WORKER', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "MessageSenderRole" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "signedByWorker" BOOLEAN NOT NULL DEFAULT false,
    "signedByEmployer" BOOLEAN NOT NULL DEFAULT false,
    "signatureNonce" TEXT,
    "contractUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_missionId_idx" ON "messages"("missionId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_missionId_key" ON "contracts"("missionId");

-- CreateIndex
CREATE INDEX "contracts_employerId_idx" ON "contracts"("employerId");

-- CreateIndex
CREATE INDEX "contracts_workerId_idx" ON "contracts"("workerId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

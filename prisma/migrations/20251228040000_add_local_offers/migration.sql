-- CreateEnum
CREATE TYPE "LocalOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "local_offers" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" "LocalOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_offers_missionId_idx" ON "local_offers"("missionId");

-- CreateIndex
CREATE INDEX "local_offers_workerId_idx" ON "local_offers"("workerId");

-- CreateIndex
CREATE INDEX "local_offers_status_idx" ON "local_offers"("status");

-- CreateIndex (unique constraint: one offer per worker per mission)
CREATE UNIQUE INDEX "local_offers_missionId_workerId_key" ON "local_offers"("missionId", "workerId");

-- AddForeignKey
ALTER TABLE "local_offers" ADD CONSTRAINT "local_offers_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "local_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_offers" ADD CONSTRAINT "local_offers_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- AlterTable: Add demand capture fields to local_users
ALTER TABLE "local_users" ADD COLUMN "slug" TEXT;
ALTER TABLE "local_users" ADD COLUMN "bio" TEXT;
ALTER TABLE "local_users" ADD COLUMN "category" TEXT;
ALTER TABLE "local_users" ADD COLUMN "serviceRadiusKm" INTEGER DEFAULT 25;
ALTER TABLE "local_users" ADD COLUMN "completionScore" INTEGER DEFAULT 0;

-- CreateIndex: unique slug
CREATE UNIQUE INDEX "local_users_slug_key" ON "local_users"("slug");

-- CreateIndex: slug lookup
CREATE INDEX "local_users_slug_idx" ON "local_users"("slug");

-- CreateTable: leads
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "serviceRequested" TEXT NOT NULL,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_professionalId_idx" ON "leads"("professionalId");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
CREATE INDEX "leads_professionalId_clientPhone_createdAt_idx" ON "leads"("professionalId", "clientPhone", "createdAt");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "local_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

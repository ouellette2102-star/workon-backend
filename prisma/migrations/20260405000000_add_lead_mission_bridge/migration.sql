-- AlterTable: Add lead-mission bridge fields to local_missions
ALTER TABLE "local_missions" ADD COLUMN "leadId" TEXT;
ALTER TABLE "local_missions" ADD COLUMN "clientName" TEXT;
ALTER TABLE "local_missions" ADD COLUMN "clientPhone" TEXT;
ALTER TABLE "local_missions" ADD COLUMN "clientEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "local_missions_leadId_key" ON "local_missions"("leadId");
CREATE INDEX "local_missions_leadId_idx" ON "local_missions"("leadId");

-- AddForeignKey
ALTER TABLE "local_missions" ADD CONSTRAINT "local_missions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

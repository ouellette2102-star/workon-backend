-- CreateTable: pro_media (professional gallery images)
CREATE TABLE "pro_media" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "type" TEXT NOT NULL DEFAULT 'portfolio',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pro_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pro_media_professionalId_idx" ON "pro_media"("professionalId");
CREATE INDEX "pro_media_professionalId_sortOrder_idx" ON "pro_media"("professionalId", "sortOrder");

-- AddForeignKey
ALTER TABLE "pro_media" ADD CONSTRAINT "pro_media_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "local_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "mission_photos" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_photos_missionId_idx" ON "mission_photos"("missionId");

-- CreateIndex
CREATE INDEX "mission_photos_userId_idx" ON "mission_photos"("userId");

-- AddForeignKey
ALTER TABLE "mission_photos" ADD CONSTRAINT "mission_photos_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


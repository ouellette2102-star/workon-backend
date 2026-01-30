-- CreateTable: LocalDevice for mobile app push notifications
-- This table mirrors the Device table but references LocalUser instead of User

CREATE TABLE "local_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "appVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on userId + deviceId
CREATE UNIQUE INDEX "local_devices_userId_deviceId_key" ON "local_devices"("userId", "deviceId");

-- CreateIndex: Index for fast user lookup
CREATE INDEX "local_devices_userId_idx" ON "local_devices"("userId");

-- CreateIndex: Index for active device queries
CREATE INDEX "local_devices_active_idx" ON "local_devices"("active");

-- AddForeignKey: Link to LocalUser
ALTER TABLE "local_devices" ADD CONSTRAINT "local_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "local_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

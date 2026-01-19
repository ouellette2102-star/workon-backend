-- PR-10: Scheduling & Recurrence Primitives
-- Safe migration: All changes are additive (CREATE TABLE, CREATE TYPE)
-- No data loss risk

-- CreateEnum: RecurrenceRule
CREATE TYPE "RecurrenceRule" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum: BookingStatus
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable: recurring_mission_templates
CREATE TABLE IF NOT EXISTS "recurring_mission_templates" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priceType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "recurrenceRule" "RecurrenceRule" NOT NULL,
    "recurrenceData" JSONB,
    "maxOccurrences" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_mission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: availability_slots
CREATE TABLE IF NOT EXISTS "availability_slots" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "templateId" TEXT,
    "missionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL,
    "priceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: recurring_mission_templates
CREATE INDEX IF NOT EXISTS "recurring_mission_templates_workerId_isActive_idx" ON "recurring_mission_templates"("workerId", "isActive");
CREATE INDEX IF NOT EXISTS "recurring_mission_templates_categoryId_idx" ON "recurring_mission_templates"("categoryId");
CREATE INDEX IF NOT EXISTS "recurring_mission_templates_validFrom_validUntil_idx" ON "recurring_mission_templates"("validFrom", "validUntil");

-- CreateIndex: availability_slots
CREATE INDEX IF NOT EXISTS "availability_slots_workerId_dayOfWeek_idx" ON "availability_slots"("workerId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "availability_slots_workerId_specificDate_idx" ON "availability_slots"("workerId", "specificDate");

-- CreateIndex: bookings
CREATE INDEX IF NOT EXISTS "bookings_clientId_idx" ON "bookings"("clientId");
CREATE INDEX IF NOT EXISTS "bookings_workerId_scheduledAt_idx" ON "bookings"("workerId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_scheduledAt_idx" ON "bookings"("scheduledAt");

-- AddForeignKey: recurring_mission_templates -> worker_profiles
ALTER TABLE "recurring_mission_templates" ADD CONSTRAINT "recurring_mission_templates_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: recurring_mission_templates -> categories
ALTER TABLE "recurring_mission_templates" ADD CONSTRAINT "recurring_mission_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: availability_slots -> worker_profiles
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: bookings -> users (client)
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: bookings -> worker_profiles
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: bookings -> recurring_mission_templates (optional)
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "recurring_mission_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;


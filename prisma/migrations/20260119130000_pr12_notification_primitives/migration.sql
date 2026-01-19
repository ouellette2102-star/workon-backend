-- PR-12: Notification Primitives Migration
-- Adds notification preferences, queue, and delivery tracking

-- CreateEnum: NotificationType
CREATE TYPE "NotificationType" AS ENUM (
    'MISSION_NEW_OFFER',
    'MISSION_OFFER_ACCEPTED',
    'MISSION_STARTED',
    'MISSION_COMPLETED',
    'MISSION_CANCELLED',
    'MESSAGE_NEW',
    'MESSAGE_UNREAD_REMINDER',
    'PAYMENT_RECEIVED',
    'PAYMENT_SENT',
    'PAYMENT_FAILED',
    'PAYOUT_PROCESSED',
    'REVIEW_RECEIVED',
    'REVIEW_REMINDER',
    'ACCOUNT_SECURITY',
    'ACCOUNT_VERIFICATION',
    'BOOKING_REQUEST',
    'BOOKING_CONFIRMED',
    'BOOKING_REMINDER',
    'BOOKING_CANCELLED',
    'MARKETING_PROMO',
    'MARKETING_NEWS'
);

-- CreateEnum: DigestFrequency
CREATE TYPE "DigestFrequency" AS ENUM (
    'IMMEDIATE',
    'HOURLY',
    'DAILY',
    'WEEKLY'
);

-- CreateEnum: NotificationPriority
CREATE TYPE "NotificationPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'CRITICAL'
);

-- CreateEnum: NotificationQueueStatus
CREATE TYPE "NotificationQueueStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DELIVERED',
    'PARTIAL',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

-- CreateEnum: DeliveryStatus
CREATE TYPE "DeliveryStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'BOUNCED',
    'UNSUBSCRIBED'
);

-- CreateTable: notification_preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" "DigestFrequency",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_queue
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationQueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "deliveryResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_deliveries
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "deviceId" TEXT,
    "pushToken" TEXT,
    "emailAddress" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: notification_preferences
CREATE UNIQUE INDEX "notification_preferences_userId_notificationType_key" ON "notification_preferences"("userId", "notificationType");
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex: notification_queue
CREATE UNIQUE INDEX "notification_queue_idempotencyKey_key" ON "notification_queue"("idempotencyKey");
CREATE INDEX "notification_queue_userId_idx" ON "notification_queue"("userId");
CREATE INDEX "notification_queue_status_scheduledFor_idx" ON "notification_queue"("status", "scheduledFor");
CREATE INDEX "notification_queue_notificationType_idx" ON "notification_queue"("notificationType");
CREATE INDEX "notification_queue_priority_scheduledFor_idx" ON "notification_queue"("priority", "scheduledFor");
CREATE INDEX "notification_queue_correlationId_idx" ON "notification_queue"("correlationId");

-- CreateIndex: notification_deliveries
CREATE INDEX "notification_deliveries_queueId_idx" ON "notification_deliveries"("queueId");
CREATE INDEX "notification_deliveries_userId_createdAt_idx" ON "notification_deliveries"("userId", "createdAt");
CREATE INDEX "notification_deliveries_channel_status_idx" ON "notification_deliveries"("channel", "status");
CREATE INDEX "notification_deliveries_providerMessageId_idx" ON "notification_deliveries"("providerMessageId");

-- AddForeignKey: notification_preferences -> users
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notification_queue -> users
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notification_deliveries -> notification_queue
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "notification_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notification_deliveries -> users
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


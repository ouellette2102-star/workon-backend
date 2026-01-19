import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationQueue,
  NotificationDelivery,
  NotificationType,
  NotificationPriority,
  NotificationQueueStatus,
  DeliveryStatus,
  Prisma,
} from '@prisma/client';
import { NotificationPreferencesService } from './notification-preferences.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notification Queue Service
 * PR-12: Notification Primitives
 *
 * Manages the notification queue for reliable delivery.
 * Supports scheduling, priorities, retries, and delivery tracking.
 *
 * NOTE: This PR only implements the data primitives.
 * Actual sending is NOT implemented yet (PR-XX).
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Queue a notification for delivery
   * Respects user preferences for channels
   */
  async queueNotification(params: {
    userId: string;
    notificationType: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority?: NotificationPriority;
    scheduledFor?: Date;
    correlationId?: string;
    idempotencyKey?: string;
  }): Promise<NotificationQueue> {
    const {
      userId,
      notificationType,
      title,
      body,
      data,
      priority = NotificationPriority.NORMAL,
      scheduledFor = new Date(),
      correlationId,
      idempotencyKey,
    } = params;

    // Check for duplicate using idempotency key
    if (idempotencyKey) {
      const existing = await this.prisma.notificationQueue.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        this.logger.debug(`Duplicate notification skipped: ${idempotencyKey}`);
        return existing;
      }
    }

    // Get enabled channels from user preferences
    const channels = await this.preferencesService.getEnabledChannels(
      userId,
      notificationType,
    );

    if (channels.length === 0) {
      this.logger.debug(
        `No channels enabled for user ${userId}, type ${notificationType}`,
      );
      // Still create the queue entry for audit, but mark as cancelled
      return this.prisma.notificationQueue.create({
        data: {
          userId,
          notificationType,
          title,
          body,
          data: data as Prisma.InputJsonValue,
          channels: [],
          priority,
          scheduledFor,
          status: NotificationQueueStatus.CANCELLED,
          correlationId,
          idempotencyKey,
          errorMessage: 'No channels enabled by user preferences',
        },
      });
    }

    // Check quiet hours (for non-critical notifications)
    const pref = await this.preferencesService.getPreference(userId, notificationType);
    if (pref && priority !== NotificationPriority.CRITICAL) {
      if (this.preferencesService.isInQuietHours(pref)) {
        // Schedule for after quiet hours end
        const nextDeliveryTime = this.calculateNextDeliveryTime(pref);
        this.logger.debug(
          `Notification scheduled for after quiet hours: ${nextDeliveryTime.toISOString()}`,
        );
        return this.prisma.notificationQueue.create({
          data: {
            userId,
            notificationType,
            title,
            body,
            data: data as Prisma.InputJsonValue,
            channels,
            priority,
            scheduledFor: nextDeliveryTime,
            status: NotificationQueueStatus.PENDING,
            correlationId,
            idempotencyKey,
          },
        });
      }
    }

    // Create queue entry
    const queued = await this.prisma.notificationQueue.create({
      data: {
        userId,
        notificationType,
        title,
        body,
        data: data as Prisma.InputJsonValue,
        channels,
        priority,
        scheduledFor,
        status: NotificationQueueStatus.PENDING,
        correlationId,
        idempotencyKey,
      },
    });

    this.logger.log(
      `Notification queued: ${queued.id} for user ${userId}, type ${notificationType}`,
    );

    return queued;
  }

  /**
   * Get pending notifications ready for delivery
   */
  async getPendingNotifications(
    limit = 100,
    priority?: NotificationPriority,
  ): Promise<NotificationQueue[]> {
    const now = new Date();

    return this.prisma.notificationQueue.findMany({
      where: {
        status: NotificationQueueStatus.PENDING,
        scheduledFor: { lte: now },
        ...(priority && { priority }),
      },
      orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
      take: limit,
    });
  }

  /**
   * Mark notification as processing
   */
  async markAsProcessing(queueId: string): Promise<NotificationQueue> {
    return this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: NotificationQueueStatus.PROCESSING,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(
    queueId: string,
    deliveryResults?: Record<string, unknown>,
  ): Promise<NotificationQueue> {
    return this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: NotificationQueueStatus.DELIVERED,
        deliveredAt: new Date(),
        deliveryResults: deliveryResults as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Mark notification as partially delivered
   */
  async markAsPartial(
    queueId: string,
    deliveryResults: Record<string, unknown>,
  ): Promise<NotificationQueue> {
    return this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: NotificationQueueStatus.PARTIAL,
        deliveredAt: new Date(),
        deliveryResults: deliveryResults as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(
    queueId: string,
    errorMessage: string,
  ): Promise<NotificationQueue> {
    const queue = await this.prisma.notificationQueue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new Error(`Queue entry not found: ${queueId}`);
    }

    // Check if we should retry
    if (queue.attempts < queue.maxAttempts) {
      // Exponential backoff: 1min, 5min, 15min
      const backoffMinutes = Math.pow(3, queue.attempts);
      const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      return this.prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          status: NotificationQueueStatus.PENDING,
          scheduledFor: nextAttempt,
          errorMessage,
        },
      });
    }

    // Max attempts reached - mark as failed
    return this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: NotificationQueueStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
      },
    });
  }

  /**
   * Cancel a pending notification
   */
  async cancelNotification(queueId: string): Promise<NotificationQueue> {
    return this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: NotificationQueueStatus.CANCELLED,
      },
    });
  }

  /**
   * Record delivery attempt for a channel
   */
  async recordDeliveryAttempt(params: {
    queueId: string;
    userId: string;
    channel: string;
    provider?: string;
    deviceId?: string;
    pushToken?: string;
    emailAddress?: string;
  }): Promise<NotificationDelivery> {
    return this.prisma.notificationDelivery.create({
      data: {
        queueId: params.queueId,
        userId: params.userId,
        channel: params.channel,
        status: DeliveryStatus.PENDING,
        provider: params.provider,
        deviceId: params.deviceId,
        pushToken: params.pushToken,
        emailAddress: params.emailAddress,
      },
    });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    details?: {
      providerMessageId?: string;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<NotificationDelivery> {
    const now = new Date();
    const data: Prisma.NotificationDeliveryUpdateInput = {
      status,
      providerMessageId: details?.providerMessageId,
      errorCode: details?.errorCode,
      errorMessage: details?.errorMessage,
    };

    switch (status) {
      case DeliveryStatus.SENT:
        data.sentAt = now;
        break;
      case DeliveryStatus.DELIVERED:
        data.deliveredAt = now;
        break;
      case DeliveryStatus.READ:
        data.readAt = now;
        break;
      case DeliveryStatus.FAILED:
      case DeliveryStatus.BOUNCED:
        data.failedAt = now;
        break;
    }

    return this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data,
    });
  }

  /**
   * Get notification history for a user
   */
  async getUserNotificationHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: NotificationQueueStatus;
      notificationType?: NotificationType;
    },
  ): Promise<{ items: NotificationQueue[]; total: number }> {
    const { limit = 20, offset = 0, status, notificationType } = options || {};

    const where: Prisma.NotificationQueueWhereInput = {
      userId,
      ...(status && { status }),
      ...(notificationType && { notificationType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notificationQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          deliveries: true,
        },
      }),
      this.prisma.notificationQueue.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
    byPriority: Record<string, number>;
  }> {
    const stats = await this.prisma.notificationQueue.groupBy({
      by: ['status'],
      _count: true,
    });

    const priorityStats = await this.prisma.notificationQueue.groupBy({
      by: ['priority'],
      where: { status: NotificationQueueStatus.PENDING },
      _count: true,
    });

    return {
      pending: stats.find((s) => s.status === 'PENDING')?._count || 0,
      processing: stats.find((s) => s.status === 'PROCESSING')?._count || 0,
      delivered: stats.find((s) => s.status === 'DELIVERED')?._count || 0,
      failed: stats.find((s) => s.status === 'FAILED')?._count || 0,
      byPriority: priorityStats.reduce(
        (acc, s) => {
          acc[s.priority] = s._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Clean up old delivered/failed notifications
   */
  async cleanupOldNotifications(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.notificationQueue.deleteMany({
      where: {
        status: {
          in: [
            NotificationQueueStatus.DELIVERED,
            NotificationQueueStatus.FAILED,
            NotificationQueueStatus.CANCELLED,
          ],
        },
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);
    return result.count;
  }

  /**
   * Calculate next delivery time after quiet hours
   */
  private calculateNextDeliveryTime(pref: {
    quietHoursEnd: string | null;
    timezone: string;
  }): Date {
    if (!pref.quietHoursEnd) {
      return new Date();
    }

    const now = new Date();
    const [hours, minutes] = pref.quietHoursEnd.split(':').map(Number);

    // Create date with quiet hours end time
    const nextDelivery = new Date(now);
    nextDelivery.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextDelivery <= now) {
      nextDelivery.setDate(nextDelivery.getDate() + 1);
    }

    return nextDelivery;
  }
}


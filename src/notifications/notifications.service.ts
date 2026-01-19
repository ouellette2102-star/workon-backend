import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { DevicesService } from '../devices/devices.service';

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * Créer une notification pour un nouveau message dans une mission.
   *
   * PR-PUSH: Also sends a push notification to the receiver's devices.
   */
  async createForNewMessage(
    missionId: string,
    messageId: string,
    receiverClerkId: string,
    senderName?: string,
    messagePreview?: string,
  ): Promise<void> {
    try {
      // Trouver l'utilisateur par clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId: receiverClerkId },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`User not found for clerkId: ${receiverClerkId}`);
        return;
      }

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: user.id,
          type: 'NEW_MESSAGE',
          payloadJSON: {
            missionId,
            messageId,
          },
        },
      });

      // PR-PUSH: Send push notification
      await this.sendPushForNewMessage(
        user.id,
        missionId,
        senderName || 'Quelqu\'un',
        messagePreview || 'Nouveau message',
      );
    } catch (error) {
      this.logger.error(`Failed to create notification for new message: ${error.message}`);
    }
  }

  /**
   * PR-PUSH: Send push notification for a new message.
   *
   * @param userId - Internal user ID (not clerkId)
   * @param missionId - Mission/conversation ID
   * @param senderName - Name of the sender
   * @param preview - Message preview text
   */
  private async sendPushForNewMessage(
    userId: string,
    missionId: string,
    senderName: string,
    preview: string,
  ): Promise<void> {
    try {
      // Get push tokens for this user
      const tokens = await this.devicesService.getPushTokensForUser(userId);

      if (!tokens.length) {
        this.logger.debug(`No push tokens for user ${userId}`);
        return;
      }

      await this.pushService.sendChatMessageNotification(tokens, {
        conversationId: missionId,
        missionId,
        senderName,
        preview,
      });
    } catch (error) {
      // Don't throw - push failure shouldn't break the message flow
      this.logger.error(`Failed to send push notification: ${error.message}`);
    }
  }

  /**
   * Créer une notification pour un changement de statut de mission
   */
  async createForMissionStatusChange(
    missionId: string,
    statusBefore: string,
    statusAfter: string,
    receiverClerkId: string,
  ): Promise<void> {
    try {
      // Trouver l'utilisateur par clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId: receiverClerkId },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`User not found for clerkId: ${receiverClerkId}`);
        return;
      }

      await this.prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: user.id,
          type: 'MISSION_STATUS_CHANGED',
          payloadJSON: {
            missionId,
            statusBefore,
            statusAfter,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for mission status change: ${error.message}`);
    }
  }

  /**
   * Créer une notification pour un événement de temps (CHECK_IN / CHECK_OUT)
   */
  async createForMissionTimeEvent(
    missionId: string,
    eventType: 'CHECK_IN' | 'CHECK_OUT',
    receiverClerkId: string,
  ): Promise<void> {
    try {
      // Trouver l'utilisateur par clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId: receiverClerkId },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`User not found for clerkId: ${receiverClerkId}`);
        return;
      }

      await this.prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: user.id,
          type: 'MISSION_TIME_EVENT',
          payloadJSON: {
            missionId,
            eventType,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for mission time event: ${error.message}`);
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getNotifications(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationResponse[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications.map((notif) => ({
      id: notif.id,
      userId: notif.userId,
      type: notif.type,
      payload: notif.payloadJSON,
      isRead: notif.readAt !== null,
      createdAt: notif.createdAt.toISOString(),
      readAt: notif.readAt ? notif.readAt.toISOString() : null,
    }));
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  /**
   * Compter les notifications non lues d'un utilisateur
   */
  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }
}


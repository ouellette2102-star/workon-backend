import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { LocalMessageRole, LocalMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContactFilterService } from '../common/security/contact-filter.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface LocalMessageResponse {
  id: string;
  missionId: string;
  senderId: string;
  senderRole: LocalMessageRole;
  content: string;
  status: LocalMessageStatus;
  createdAt: string;
}

export interface LocalConversation {
  id: string;
  missionId: string;
  missionTitle: string;
  participantName: string;
  participantAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  myRole: 'EMPLOYER' | 'WORKER';
}

/**
 * LocalMessages Service - Chat for LocalUser system
 * 
 * Replaces the old MessagesService which used Clerk User model.
 * This service works with LocalMission and LocalUser.
 */
@Injectable()
export class MessagesLocalService {
  private readonly logger = new Logger(MessagesLocalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contactFilter: ContactFilterService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyNewMessage(
    recipientId: string,
    senderId: string,
    missionId: string,
    messageId: string,
    preview: string,
  ): Promise<void> {
    try {
      const sender = await this.prisma.localUser.findUnique({
        where: { id: senderId },
        select: { firstName: true },
      });
      const senderName = sender?.firstName || 'Un utilisateur';

      await this.notificationsService.createLocalNotification(
        recipientId,
        'new_message',
        `Nouveau message de ${senderName}`,
        preview.length > 80 ? preview.slice(0, 77) + '...' : preview,
        { missionId, messageId, senderId },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to create LocalNotification for message ${messageId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * Check if user has access to a mission's chat
   * Returns the user's role in the conversation
   */
  private async checkMissionAccess(
    missionId: string,
    userId: string,
  ): Promise<{ canAccess: boolean; senderRole: LocalMessageRole | null }> {
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        createdByUserId: true,
        assignedToUserId: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // User is the employer (mission creator)
    if (mission.createdByUserId === userId) {
      return { canAccess: true, senderRole: LocalMessageRole.EMPLOYER };
    }

    // User is the assigned worker
    if (mission.assignedToUserId === userId) {
      return { canAccess: true, senderRole: LocalMessageRole.WORKER };
    }

    return { canAccess: false, senderRole: null };
  }

  /**
   * Get all messages for a mission
   */
  async getMessagesForMission(
    missionId: string,
    userId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<{ messages: LocalMessageResponse[]; nextCursor: string | null; hasMore: boolean }> {
    const { canAccess } = await this.checkMissionAccess(missionId, userId);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux messages de cette mission",
      );
    }

    const limit = Math.min(options?.limit || 50, 100);
    const whereClause: any = { missionId };

    if (options?.cursor) {
      whereClause.createdAt = { gt: new Date(options.cursor) };
    }

    const messages = await this.prisma.localMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return {
      messages: items.map((msg) => ({
        id: msg.id,
        missionId: msg.missionId,
        senderId: msg.senderId,
        senderRole: msg.senderRole,
        content: msg.content,
        status: msg.status,
        createdAt: msg.createdAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Send a message in a mission chat
   */
  async createMessage(
    missionId: string,
    userId: string,
    content: string,
  ): Promise<LocalMessageResponse> {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    // Anti-disintermediation: filter contact information
    const { filtered, wasFiltered } = this.contactFilter.filterMessage(trimmedContent);

    const { canAccess, senderRole } = await this.checkMissionAccess(
      missionId,
      userId,
    );

    if (!canAccess || !senderRole) {
      throw new ForbiddenException(
        "Vous n'avez pas le droit d'envoyer des messages pour cette mission",
      );
    }

    // Check that mission has an assigned worker (no chat without worker)
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: {
        assignedToUserId: true,
        createdByUserId: true,
      },
    });

    if (!mission?.assignedToUserId) {
      throw new BadRequestException(
        "Le chat n'est disponible que lorsqu'un worker est assigné à la mission",
      );
    }

    const message = await this.prisma.localMessage.create({
      data: {
        id: `lmsg_${crypto.randomUUID().replace(/-/g, '')}`,
        missionId,
        senderId: userId,
        senderRole,
        content: wasFiltered ? filtered : trimmedContent,
      },
    });

    if (wasFiltered) {
      this.logger.warn(`Contact info filtered from message ${message.id} by user ${userId}`);
    }

    this.logger.log(`Message created: ${message.id} for mission ${missionId}`);

    const recipientId =
      userId === mission.createdByUserId
        ? mission.assignedToUserId
        : mission.createdByUserId;
    if (recipientId && recipientId !== userId) {
      await this.notifyNewMessage(
        recipientId,
        userId,
        missionId,
        message.id,
        message.content,
      );
    }

    return {
      id: message.id,
      missionId: message.missionId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Send a direct message — creates a mission-conversation if none exists
   */
  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    if (senderId === recipientId) {
      throw new BadRequestException('Vous ne pouvez pas vous envoyer un message');
    }

    // Check if a conversation mission already exists between these two users
    let mission = await this.prisma.localMission.findFirst({
      where: {
        OR: [
          { createdByUserId: senderId, assignedToUserId: recipientId },
          { createdByUserId: recipientId, assignedToUserId: senderId },
        ],
        status: { notIn: ['cancelled'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If no mission exists, create one with the recipient pre-assigned
    if (!mission) {
      const sender = await this.prisma.localUser.findUnique({
        where: { id: senderId },
        select: { firstName: true, role: true },
      });
      const recipient = await this.prisma.localUser.findUnique({
        where: { id: recipientId },
        select: { firstName: true, role: true, category: true },
      });

      if (!recipient) {
        throw new BadRequestException('Destinataire introuvable');
      }

      // Determine who is employer and who is worker
      const isWorkerSending = sender?.role === 'worker';
      const creatorId = isWorkerSending ? recipientId : senderId;
      const workerId = isWorkerSending ? senderId : recipientId;

      mission = await this.prisma.localMission.create({
        data: {
          id: `lm_dm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          title: `Conversation — ${sender?.firstName || 'Utilisateur'} & ${recipient.firstName}`,
          description: 'Conversation directe via WorkOn',
          category: recipient.category || 'other',
          price: 0,
          latitude: 45.5017,
          longitude: -73.5673,
          city: 'Montreal',
          createdByUserId: creatorId,
          assignedToUserId: workerId,
          status: 'assigned',
          updatedAt: new Date(),
        },
      });

      this.logger.log(`DM mission created: ${mission.id} between ${senderId} and ${recipientId}`);
    }

    // Now send the message using the existing method
    const { filtered, wasFiltered } = this.contactFilter.filterMessage(content.trim());

    const senderRole = mission.createdByUserId === senderId ? 'EMPLOYER' : 'WORKER';

    const message = await this.prisma.localMessage.create({
      data: {
        id: `lmsg_${crypto.randomUUID().replace(/-/g, '')}`,
        missionId: mission.id,
        senderId,
        senderRole,
        content: wasFiltered ? filtered : content.trim(),
      },
    });

    this.logger.log(`DM sent: ${message.id} from ${senderId} to ${recipientId} via mission ${mission.id}`);

    await this.notifyNewMessage(
      recipientId,
      senderId,
      mission.id,
      message.id,
      message.content,
    );

    return {
      id: message.id,
      missionId: mission.id,
      content: message.content,
      senderRole: message.senderRole,
      createdAt: message.createdAt,
    };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(
    missionId: string,
    userId: string,
  ): Promise<{ count: number }> {
    const { canAccess, senderRole } = await this.checkMissionAccess(
      missionId,
      userId,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux messages de cette mission",
      );
    }

    // Mark as read: messages sent by the OTHER party
    const oppositeRole =
      senderRole === LocalMessageRole.EMPLOYER
        ? LocalMessageRole.WORKER
        : LocalMessageRole.EMPLOYER;

    const result = await this.prisma.localMessage.updateMany({
      where: {
        missionId,
        senderRole: oppositeRole,
        status: { not: LocalMessageStatus.READ },
      },
      data: {
        status: LocalMessageStatus.READ,
      },
    });

    return { count: result.count };
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    // Get missions where user is involved
    const count = await this.prisma.localMessage.count({
      where: {
        senderId: { not: userId },
        status: { not: LocalMessageStatus.READ },
        mission: {
          OR: [
            { createdByUserId: userId },
            { assignedToUserId: userId },
          ],
        },
      },
    });

    return { count };
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<LocalConversation[]> {
    // Find missions where user is involved and has messages
    const missions = await this.prisma.localMission.findMany({
      where: {
        OR: [
          { createdByUserId: userId },
          { assignedToUserId: userId },
        ],
        messages: {
          some: {},
        },
      },
      include: {
        createdByUser: true,
        assignedToUser: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const conversations = await Promise.all(
      missions.map(async (mission) => {
        const isEmployer = mission.createdByUserId === userId;
        const lastMessage = mission.messages[0];

        // Get the other participant
        const participant = isEmployer
          ? mission.assignedToUser
          : mission.createdByUser;

        // Count unread messages
        const unreadCount = await this.prisma.localMessage.count({
          where: {
            missionId: mission.id,
            senderId: { not: userId },
            status: { not: LocalMessageStatus.READ },
          },
        });

        const participantName = participant
          ? `${participant.firstName} ${participant.lastName}`
          : 'Participant';

        return {
          id: mission.id,
          missionId: mission.id,
          missionTitle: mission.title,
          participantName,
          participantAvatar: participant?.pictureUrl || null,
          lastMessage: lastMessage?.content || '',
          lastMessageAt: lastMessage?.createdAt.toISOString() || new Date().toISOString(),
          unreadCount,
          myRole: isEmployer ? 'EMPLOYER' : 'WORKER',
        } as LocalConversation;
      }),
    );

    // Sort by most recent message
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );

    return conversations;
  }
}

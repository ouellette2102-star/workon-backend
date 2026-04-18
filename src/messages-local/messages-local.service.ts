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
  // Canonical shape consumed by the frontend conversationListSchema
  // (src/lib/api-schemas.ts). Do not rename fields without aligning the
  // Zod schema — mismatches throw and trigger the app error boundary.
  //
  // Polymorphic: exactly one of `missionId` / `conversationId` is set.
  // - missionId set  → thread is attached to a LocalMission (job chat)
  // - conversationId → thread is a pure DM (post-swipe-match)
  missionId: string | null;
  conversationId: string | null;
  missionTitle: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  // Legacy fields kept for back-compat; will be dropped once no caller reads them.
  id: string;
  participantName: string;
  participantAvatar: string | null;
  myRole: 'EMPLOYER' | 'WORKER' | 'CLIENT';
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
        missionId: msg.missionId as string, // guaranteed non-null: filtered by missionId in the query
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
      missionId: message.missionId as string, // non-null: mission-chat branch
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
   * Get all conversations for a user — returns UNION of:
   *  - mission-chats (LocalMission with messages)
   *  - pure Conversation threads (post-swipe-match DM)
   *
   * Each item carries EITHER `missionId` OR `conversationId` (the other
   * is null). Frontend routes to /messages/[missionId] vs
   * /messages/cv/[conversationId] depending on which is set.
   */
  async getConversations(userId: string): Promise<LocalConversation[]> {
    // ── 1. Mission-chats ────────────────────────────────────────────
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

    const missionItems = await Promise.all(
      missions.map(async (mission) => {
        const isEmployer = mission.createdByUserId === userId;
        const lastMessage = mission.messages[0];
        const participant = isEmployer
          ? mission.assignedToUser
          : mission.createdByUser;
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
          missionId: mission.id,
          conversationId: null,
          missionTitle: mission.title,
          otherUser: {
            id: participant?.id ?? '',
            firstName: participant?.firstName ?? '',
            lastName: participant?.lastName ?? '',
          },
          lastMessage: lastMessage?.content ?? null,
          lastMessageAt:
            lastMessage?.createdAt.toISOString() ?? new Date().toISOString(),
          unreadCount,
          id: mission.id,
          participantName,
          participantAvatar: participant?.pictureUrl ?? null,
          myRole: isEmployer ? 'EMPLOYER' : 'WORKER',
        } as unknown as LocalConversation;
      }),
    );

    // ── 2. Pure Conversation threads (post-match DM) ────────────────
    const convs = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const convItems = await Promise.all(
      convs.map(async (c) => {
        const otherUserId =
          c.participantAId === userId ? c.participantBId : c.participantAId;
        const other = await this.prisma.localUser.findUnique({
          where: { id: otherUserId },
          select: { id: true, firstName: true, lastName: true, pictureUrl: true },
        });
        const unreadCount = await this.prisma.localMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            status: { not: LocalMessageStatus.READ },
          },
        });
        const last = c.messages[0];
        const fullName =
          [other?.firstName, other?.lastName].filter(Boolean).join(' ') ||
          'Participant';
        return {
          missionId: null,
          conversationId: c.id,
          missionTitle: fullName,
          otherUser: {
            id: other?.id ?? otherUserId,
            firstName: other?.firstName ?? '',
            lastName: other?.lastName ?? '',
          },
          lastMessage: last?.content ?? null,
          lastMessageAt:
            c.lastMessageAt?.toISOString() ??
            last?.createdAt.toISOString() ??
            c.createdAt.toISOString(),
          unreadCount,
          id: c.id,
          participantName: fullName,
          participantAvatar: other?.pictureUrl ?? null,
          myRole: 'CLIENT',
        } as unknown as LocalConversation;
      }),
    );

    // ── 3. Merge + sort by most recent ──────────────────────────────
    const merged = [...missionItems, ...convItems];
    merged.sort(
      (a, b) =>
        new Date((b as any).lastMessageAt).getTime() -
        new Date((a as any).lastMessageAt).getTime(),
    );

    return merged;
  }
}

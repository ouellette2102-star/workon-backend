import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { LocalMessageRole, LocalMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContactFilterService } from '../common/security/contact-filter.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ConversationMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: LocalMessageRole;
  content: string;
  status: LocalMessageStatus;
  createdAt: string;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contactFilter: ContactFilterService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private orderPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<{ otherUserId: string }> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participantAId: true, participantBId: true },
    });
    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }
    if (conv.participantAId !== userId && conv.participantBId !== userId) {
      throw new ForbiddenException("Vous n'avez pas accès à cette conversation");
    }
    return {
      otherUserId:
        conv.participantAId === userId ? conv.participantBId : conv.participantAId,
    };
  }

  /**
   * List conversations for a user, with metadata for UI rendering.
   */
  async listForUser(userId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return Promise.all(
      convs.map(async (c) => {
        const otherUserId =
          c.participantAId === userId ? c.participantBId : c.participantAId;
        const other = await this.prisma.localUser.findUnique({
          where: { id: otherUserId },
          select: { id: true, firstName: true, lastName: true, pictureUrl: true },
        });
        const unread = await this.prisma.localMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            status: { not: LocalMessageStatus.READ },
          },
        });
        const last = c.messages[0];
        return {
          conversationId: c.id,
          missionId: null as string | null,
          missionTitle: null as string | null,
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
          unreadCount: unread,
          // Legacy shape compat for GET /messages-local/conversations union
          id: c.id,
          participantName:
            [other?.firstName, other?.lastName].filter(Boolean).join(' ') ||
            'Participant',
          participantAvatar: other?.pictureUrl ?? null,
          myRole: 'CLIENT' as const,
        };
      }),
    );
  }

  /**
   * Get messages in a conversation (cursor-paginated).
   */
  async getMessages(
    conversationId: string,
    userId: string,
    opts?: { cursor?: string; limit?: number },
  ) {
    await this.assertParticipant(conversationId, userId);

    const limit = Math.min(opts?.limit || 50, 100);
    const where: any = { conversationId };
    if (opts?.cursor) {
      where.createdAt = { gt: new Date(opts.cursor) };
    }

    const msgs = await this.prisma.localMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });
    const hasMore = msgs.length > limit;
    const items = hasMore ? msgs.slice(0, limit) : msgs;

    return {
      messages: items.map((m) => ({
        id: m.id,
        conversationId: m.conversationId!,
        senderId: m.senderId,
        senderRole: m.senderRole,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Send a message in a conversation. Caller must be a participant.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<ConversationMessageResponse> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    const { otherUserId } = await this.assertParticipant(
      conversationId,
      senderId,
    );

    const { filtered, wasFiltered } =
      this.contactFilter.filterMessage(trimmed);

    const msg = await this.prisma.localMessage.create({
      data: {
        id: `lmsg_${crypto.randomUUID().replace(/-/g, '')}`,
        conversationId,
        senderId,
        senderRole: LocalMessageRole.EMPLOYER, // role inside a pure conv is neutral; keep schema-compat
        content: wasFiltered ? filtered : trimmed,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt },
    });

    if (wasFiltered) {
      this.logger.warn(
        `Contact info filtered from conversation message ${msg.id} (user ${senderId})`,
      );
    }

    // Non-blocking push notification
    try {
      const sender = await this.prisma.localUser.findUnique({
        where: { id: senderId },
        select: { firstName: true },
      });
      await this.notificationsService.createLocalNotification(
        otherUserId,
        'new_message',
        `Nouveau message de ${sender?.firstName || 'un utilisateur'}`,
        msg.content.length > 80 ? msg.content.slice(0, 77) + '...' : msg.content,
        { conversationId, messageId: msg.id, senderId },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify conversation message ${msg.id}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    return {
      id: msg.id,
      conversationId: msg.conversationId!,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      content: msg.content,
      status: msg.status,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  /**
   * Mark messages in a conversation as read (from the opposite party).
   */
  async markAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ count: number }> {
    await this.assertParticipant(conversationId, userId);
    const result = await this.prisma.localMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: LocalMessageStatus.READ },
      },
      data: { status: LocalMessageStatus.READ },
    });
    return { count: result.count };
  }
}

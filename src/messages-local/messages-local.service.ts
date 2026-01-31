import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LocalMessageRole, LocalMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<LocalMessageResponse[]> {
    const { canAccess } = await this.checkMissionAccess(missionId, userId);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux messages de cette mission",
      );
    }

    const messages = await this.prisma.localMessage.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      missionId: msg.missionId,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      content: msg.content,
      status: msg.status,
      createdAt: msg.createdAt.toISOString(),
    }));
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
      select: { assignedToUserId: true },
    });

    if (!mission?.assignedToUserId) {
      throw new BadRequestException(
        "Le chat n'est disponible que lorsqu'un worker est assigné à la mission",
      );
    }

    const message = await this.prisma.localMessage.create({
      data: {
        id: `lmsg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        missionId,
        senderId: userId,
        senderRole,
        content: trimmedContent,
      },
    });

    this.logger.log(`Message created: ${message.id} for mission ${missionId}`);

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

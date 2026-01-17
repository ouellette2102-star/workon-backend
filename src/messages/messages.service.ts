import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MessageSenderRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface MessageResponse {
  id: string;
  missionId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  content: string;
  createdAt: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL CONVERSATIONS (missions-local + local_users)
  // ─────────────────────────────────────────────────────────────────────────

  private async getLocalMissionAccess(
    missionId: string,
    userId: string,
  ): Promise<{ canAccess: boolean }> {
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

    const canAccess =
      mission.createdByUserId === userId || mission.assignedToUserId === userId;
    return { canAccess };
  }

  async getLocalConversations(userId: string) {
    const missions = await this.prisma.localMission.findMany({
      where: {
        OR: [{ createdByUserId: userId }, { assignedToUserId: userId }],
      },
      select: {
        id: true,
        title: true,
        createdByUserId: true,
        assignedToUserId: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
      },
    });

    const conversations = await Promise.all(
      missions
        .filter((mission) => mission.assignedToUserId)
        .map(async (mission) => {
          const isOwner = mission.createdByUserId === userId;
          const participant = isOwner ? mission.assignedToUser : mission.createdByUser;

          const lastMessage = await this.prisma.localMessage.findFirst({
            where: { missionId: mission.id },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true },
          });

          const unreadCount = await this.prisma.localMessage.count({
            where: {
              missionId: mission.id,
              senderId: { not: userId },
              status: { not: 'READ' },
            },
          });

          const participantName = participant
            ? [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() ||
              'Utilisateur'
            : 'Utilisateur';

          return {
            id: mission.id,
            participantId: participant?.id ?? '',
            participantName,
            participantAvatar: participant?.pictureUrl ?? null,
            lastMessage: lastMessage?.content ?? null,
            lastMessageAt: lastMessage?.createdAt ?? null,
            unreadCount,
            missionId: mission.id,
            missionTitle: mission.title,
          };
        }),
    );

    return conversations;
  }

  async getLocalMessagesForMission(missionId: string, userId: string) {
    const { canAccess } = await this.getLocalMissionAccess(missionId, userId);
    if (!canAccess) {
      throw new ForbiddenException("Vous n'avez pas accès aux messages de cette mission");
    }

    const messages = await this.prisma.localMessage.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        missionId: true,
        senderId: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.missionId,
      senderId: msg.senderId,
      text: msg.content,
      createdAt: msg.createdAt.toISOString(),
      isRead: msg.status === 'READ',
    }));
  }

  async createLocalMessage(missionId: string, userId: string, text: string) {
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

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

    const isParticipant =
      mission.createdByUserId === userId || mission.assignedToUserId === userId;
    if (!isParticipant) {
      throw new ForbiddenException(
        "Vous n'avez pas le droit d'envoyer des messages pour cette mission",
      );
    }

    if (!mission.assignedToUserId) {
      throw new BadRequestException(
        'Le chat est disponible uniquement lorsqu’un worker est assigné',
      );
    }

    const message = await this.prisma.localMessage.create({
      data: {
        id: `lmsg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        missionId,
        senderId: userId,
        content: trimmed,
      },
      select: {
        id: true,
        missionId: true,
        senderId: true,
        content: true,
        createdAt: true,
        status: true,
      },
    });

    return {
      id: message.id,
      conversationId: message.missionId,
      senderId: message.senderId,
      text: message.content,
      createdAt: message.createdAt.toISOString(),
      isRead: message.status === 'READ',
    };
  }

  /**
   * Vérifie que l'utilisateur a le droit d'accéder au chat de cette mission
   * Retourne { canAccess: boolean, senderRole: 'WORKER' | 'EMPLOYER' | null }
   */
  private async checkMissionAccess(
    missionId: string,
    clerkUserId: string,
  ): Promise<{ canAccess: boolean; senderRole: MessageSenderRole | null }> {
    // Récupérer la mission avec les relations nécessaires
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        authorClientId: true,
        assigneeWorkerId: true,
        authorClient: {
          select: {
            id: true,
            clerkId: true,
          },
        },
        assigneeWorker: {
          select: {
            id: true,
            clerkId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Vérifier si l'utilisateur est l'employer (authorClient)
    if (mission.authorClient.clerkId === clerkUserId) {
      return { canAccess: true, senderRole: MessageSenderRole.EMPLOYER };
    }

    // Vérifier si l'utilisateur est le worker assigné
    if (mission.assigneeWorker && mission.assigneeWorker.clerkId === clerkUserId) {
      return { canAccess: true, senderRole: MessageSenderRole.WORKER };
    }

    return { canAccess: false, senderRole: null };
  }

  async getMessagesForMission(
    missionId: string,
    clerkUserId: string,
  ): Promise<MessageResponse[]> {
    const { canAccess } = await this.checkMissionAccess(missionId, clerkUserId);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux messages de cette mission",
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        missionId: true,
        senderId: true,
        senderRole: true,
        content: true,
        createdAt: true,
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      missionId: msg.missionId,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));
  }

  async createMessage(
    missionId: string,
    clerkUserId: string,
    dto: CreateMessageDto,
  ): Promise<MessageResponse> {
    // Valider que le contenu n'est pas vide (après trim)
    const trimmedContent = dto.content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    const { canAccess, senderRole } = await this.checkMissionAccess(
      missionId,
      clerkUserId,
    );

    if (!canAccess || !senderRole) {
      throw new ForbiddenException(
        "Vous n'avez pas le droit d'envoyer des messages pour cette mission",
      );
    }

    // Vérifier que la mission a bien un worker assigné (pas de chat si pas de worker)
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        assigneeWorkerId: true,
        authorClient: {
          select: {
            clerkId: true,
          },
        },
        assigneeWorker: {
          select: {
            clerkId: true,
          },
        },
      },
    });

    if (!mission || !mission.assigneeWorkerId) {
      throw new BadRequestException(
        'Le chat n\'est disponible que lorsqu\'un worker est assigné à la mission',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        missionId,
        senderId: clerkUserId,
        senderRole,
        content: trimmedContent,
      },
      select: {
        id: true,
        missionId: true,
        senderId: true,
        senderRole: true,
        content: true,
        createdAt: true,
      },
    });

    // Créer une notification pour le destinataire
    const receiverClerkId =
      senderRole === MessageSenderRole.EMPLOYER
        ? mission.assigneeWorker?.clerkId
        : mission.authorClient.clerkId;

    if (receiverClerkId) {
      await this.notificationsService.createForNewMessage(
        missionId,
        message.id,
        receiverClerkId,
      );
    }

    return {
      id: message.id,
      missionId: message.missionId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Marquer les messages comme lus pour un utilisateur
   */
  async markAsRead(
    missionId: string,
    clerkUserId: string,
  ): Promise<{ count: number }> {
    const { canAccess, senderRole } = await this.checkMissionAccess(
      missionId,
      clerkUserId,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux messages de cette mission",
      );
    }

    // Marquer comme lus les messages envoyés par l'AUTRE partie
    const oppositeRole = senderRole === MessageSenderRole.EMPLOYER 
      ? MessageSenderRole.WORKER 
      : MessageSenderRole.EMPLOYER;

    const result = await this.prisma.message.updateMany({
      where: {
        missionId,
        senderRole: oppositeRole,
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
      },
    });

    return { count: result.count };
  }

  /**
   * Compter les messages non lus pour un utilisateur
   */
  async getUnreadCount(clerkUserId: string): Promise<{ count: number }> {
    // Trouver l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { count: 0 };
    }

    // Compter les messages non lus dans les missions où l'user est impliqué
    const count = await this.prisma.message.count({
      where: {
        status: { not: 'READ' },
        senderId: { not: clerkUserId },
        mission: {
          OR: [
            { authorClient: { clerkId: clerkUserId } },
            { assigneeWorker: { clerkId: clerkUserId } },
          ],
        },
      },
    });

    return { count };
  }
}

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
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MissionEventType, Prisma } from '@prisma/client';

export interface EmitEventParams {
  missionId: string;
  type: MissionEventType;
  actorUserId?: string;
  targetUserId?: string;
  payload?: Record<string, unknown>;
}

export interface MissionEventResponse {
  id: string;
  missionId: string;
  type: MissionEventType;
  actorUserId: string | null;
  targetUserId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedEventsResponse {
  events: MissionEventResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class MissionEventsService {
  private readonly logger = new Logger(MissionEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Émet un événement pour une mission
   */
  async emitEvent(params: EmitEventParams): Promise<MissionEventResponse> {
    const { missionId, type, actorUserId, targetUserId, payload } = params;

    this.logger.log(
      `Emitting event ${type} for mission ${missionId}` +
        (actorUserId ? ` by ${actorUserId}` : '') +
        (targetUserId ? ` targeting ${targetUserId}` : ''),
    );

    const event = await this.prisma.missionEvent.create({
      data: {
        missionId,
        type,
        actorUserId: actorUserId || null,
        targetUserId: targetUserId || null,
        payload: payload ? (payload as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return this.mapToResponse(event);
  }

  /**
   * Récupère les événements d'une mission (employer/worker seulement)
   */
  async listMissionEvents(
    missionId: string,
    clerkUserId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<PaginatedEventsResponse> {
    const { limit = 50, cursor } = options;

    // Vérifier l'accès à la mission
    const hasAccess = await this.checkMissionAccess(missionId, clerkUserId);
    if (!hasAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès aux événements de cette mission');
    }

    // Construire la requête avec pagination cursor-based
    const events = await this.prisma.missionEvent.findMany({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 pour savoir s'il y a plus
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip le cursor lui-même
      }),
    });

    const hasMore = events.length > limit;
    const paginatedEvents = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1]?.id : null;

    return {
      events: paginatedEvents.map((e) => this.mapToResponse(e)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Récupère les événements ciblant un utilisateur (feed personnel)
   */
  async listMyEvents(
    clerkUserId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<PaginatedEventsResponse> {
    const { limit = 50, cursor } = options;

    // Récupérer l'ID utilisateur interne depuis clerkId
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { events: [], nextCursor: null, hasMore: false };
    }

    // Récupérer les événements où l'utilisateur est targetUserId
    const events = await this.prisma.missionEvent.findMany({
      where: { targetUserId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = events.length > limit;
    const paginatedEvents = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1]?.id : null;

    return {
      events: paginatedEvents.map((e) => this.mapToResponse(e)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Vérifie si l'utilisateur a accès à la mission (employer ou worker)
   */
  private async checkMissionAccess(
    missionId: string,
    clerkUserId: string,
  ): Promise<boolean> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        authorClient: { select: { clerkId: true } },
        assigneeWorker: { select: { clerkId: true } },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const isAuthor = mission.authorClient.clerkId === clerkUserId;
    const isWorker = mission.assigneeWorker?.clerkId === clerkUserId;

    return isAuthor || isWorker;
  }

  /**
   * Mappe un event Prisma vers la réponse API (safe payload)
   */
  private mapToResponse(event: {
    id: string;
    missionId: string;
    type: MissionEventType;
    actorUserId: string | null;
    targetUserId: string | null;
    payload: unknown;
    createdAt: Date;
  }): MissionEventResponse {
    // S'assurer que le payload ne contient pas de données sensibles
    const safePayload = this.sanitizePayload(event.payload);

    return {
      id: event.id,
      missionId: event.missionId,
      type: event.type,
      actorUserId: event.actorUserId,
      targetUserId: event.targetUserId,
      payload: safePayload,
      createdAt: event.createdAt.toISOString(),
    };
  }

  /**
   * Supprime les données sensibles du payload
   */
  private sanitizePayload(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const raw = payload as Record<string, unknown>;
    const sensitiveKeys = [
      'stripePaymentIntentId',
      'stripeCustomerId',
      'stripeSecret',
      'token',
      'secret',
      'password',
      'apiKey',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw)) {
      if (!sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }
}


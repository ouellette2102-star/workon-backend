import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MissionTimeLogType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

export interface MissionTimeLogResponse {
  id: string;
  missionId: string;
  userId: string;
  type: MissionTimeLogType;
  note?: string;
  createdAt: string;
}

@Injectable()
export class MissionTimeLogsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Vérifier que l'utilisateur a le droit d'accéder aux time logs d'une mission
   */
  private async checkMissionAccess(
    missionId: string,
    clerkUserId: string,
  ): Promise<{ canAccess: boolean; isWorker: boolean; employerClerkId: string | null }> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        employerId: true,
        workerId: true,
        employer: {
          select: {
            user: {
              select: {
                clerkId: true,
              },
            },
          },
        },
        worker: {
          select: {
            user: {
              select: {
                clerkId: true,
              },
            },
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const isEmployer = mission.employer.user.clerkId === clerkUserId;
    const isWorker = mission.worker?.user.clerkId === clerkUserId;

    return {
      canAccess: isEmployer || isWorker,
      isWorker,
      employerClerkId: mission.employer.user.clerkId,
    };
  }

  /**
   * Récupérer les time logs d'une mission
   */
  async getLogsForMission(
    missionId: string,
    clerkUserId: string,
  ): Promise<MissionTimeLogResponse[]> {
    const { canAccess } = await this.checkMissionAccess(missionId, clerkUserId);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux logs de temps de cette mission",
      );
    }

    const logs = await this.prisma.missionTimeLog.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        missionId: true,
        userId: true,
        type: true,
        note: true,
        createdAt: true,
      },
    });

    return logs.map((log) => {
      const response: MissionTimeLogResponse = {
        id: log.id,
        missionId: log.missionId,
        userId: log.userId,
        type: log.type,
        createdAt: log.createdAt.toISOString(),
      };
      if (log.note) {
        response.note = log.note;
      }
      return response;
    });
  }

  /**
   * Enregistrer une arrivée (CHECK_IN)
   */
  async logCheckIn(
    missionId: string,
    clerkUserId: string,
    note?: string,
  ): Promise<MissionTimeLogResponse> {
    const { canAccess, isWorker, employerClerkId } =
      await this.checkMissionAccess(missionId, clerkUserId);

    if (!canAccess || !isWorker) {
      throw new ForbiddenException(
        'Seul le worker assigné peut enregistrer son temps',
      );
    }

    // Vérifier la séquence : le dernier log ne doit pas être un CHECK_IN
    const lastLog = await this.prisma.missionTimeLog.findFirst({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastLog && lastLog.type === MissionTimeLogType.CHECK_IN) {
      throw new BadRequestException(
        'Vous avez déjà enregistré votre arrivée. Enregistrez d\'abord votre départ.',
      );
    }

    // Créer le log CHECK_IN
    const log = await this.prisma.missionTimeLog.create({
      data: {
        missionId,
        userId: clerkUserId,
        type: MissionTimeLogType.CHECK_IN,
        note,
      },
      select: {
        id: true,
        missionId: true,
        userId: true,
        type: true,
        note: true,
        createdAt: true,
      },
    });

    // Créer une notification pour l'employeur
    if (employerClerkId) {
      await this.notificationsService.createForMissionTimeEvent(
        missionId,
        'CHECK_IN',
        employerClerkId,
      );
    }

    const response: MissionTimeLogResponse = {
      id: log.id,
      missionId: log.missionId,
      userId: log.userId,
      type: log.type,
      createdAt: log.createdAt.toISOString(),
    };
    if (log.note) {
      response.note = log.note;
    }
    return response;
  }

  /**
   * Enregistrer un départ (CHECK_OUT)
   */
  async logCheckOut(
    missionId: string,
    clerkUserId: string,
    note?: string,
  ): Promise<MissionTimeLogResponse> {
    const { canAccess, isWorker, employerClerkId } =
      await this.checkMissionAccess(missionId, clerkUserId);

    if (!canAccess || !isWorker) {
      throw new ForbiddenException(
        'Seul le worker assigné peut enregistrer son temps',
      );
    }

    // Vérifier la séquence : le dernier log doit être un CHECK_IN
    const lastLog = await this.prisma.missionTimeLog.findFirst({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastLog || lastLog.type !== MissionTimeLogType.CHECK_IN) {
      throw new BadRequestException(
        'Vous devez d\'abord enregistrer votre arrivée avant d\'enregistrer votre départ.',
      );
    }

    // Créer le log CHECK_OUT
    const log = await this.prisma.missionTimeLog.create({
      data: {
        missionId,
        userId: clerkUserId,
        type: MissionTimeLogType.CHECK_OUT,
        note,
      },
      select: {
        id: true,
        missionId: true,
        userId: true,
        type: true,
        note: true,
        createdAt: true,
      },
    });

    // Créer une notification pour l'employeur
    if (employerClerkId) {
      await this.notificationsService.createForMissionTimeEvent(
        missionId,
        'CHECK_OUT',
        employerClerkId,
      );
    }

    const response: MissionTimeLogResponse = {
      id: log.id,
      missionId: log.missionId,
      userId: log.userId,
      type: log.type,
      createdAt: log.createdAt.toISOString(),
    };
    if (log.note) {
      response.note = log.note;
    }
    return response;
  }
}


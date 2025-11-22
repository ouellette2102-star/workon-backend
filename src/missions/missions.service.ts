import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { MissionStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { ListAvailableMissionsDto } from './dto/list-available-missions.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { isDevEnvironment } from '../common/utils/environment.util';

type MissionSelect = {
  id: true;
  title: true;
  description: true;
  categoryId: true;
  locationAddress: true;
  locationLat: true;
  locationLng: true;
  budgetMin: true;
  budgetMax: true;
  startAt: true;
  endAt: true;
  status: true;
  authorClientId: true;
  assigneeWorkerId: true;
  priceType: true;
  createdAt: true;
  updatedAt: true;
};

type MissionRecord = Prisma.MissionGetPayload<{ select: MissionSelect }>;

const missionSelect: MissionSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  locationAddress: true,
  locationLat: true,
  locationLng: true,
  budgetMin: true,
  budgetMax: true,
  startAt: true,
  endAt: true,
  status: true,
  authorClientId: true,
  assigneeWorkerId: true,
  priceType: true,
  createdAt: true,
  updatedAt: true,
};

export interface MissionResponse {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  locationAddress: string | null;
  budgetMin: number;
  budgetMax: number;
  startAt: Date | null;
  endAt: Date | null;
  status: MissionStatus;
  authorClientId: string;
  assigneeWorkerId: string | null;
  priceType: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async createMissionForEmployer(
    userId: string,
    dto: CreateMissionDto,
  ): Promise<MissionResponse> {
    // Vérifier que l'utilisateur existe et a le rôle EMPLOYER
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.EMPLOYER && user.userProfile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Vous devez être employeur pour créer une mission');
    }

    // Utiliser une catégorie par défaut si non fournie (ou mapper depuis dto.category)
    let categoryId = dto.category || 'default-category';
    
    // Si la catégorie fournie n'est pas un ID, essayer de trouver la catégorie par nom
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [
          { id: categoryId },
          { name: { equals: categoryId, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      // Créer une nouvelle catégorie si elle n'existe pas
      const newCategory = await this.prisma.category.create({
        data: {
          id: `cat_${Date.now()}`,
          name: categoryId,
        },
      });
      categoryId = newCategory.id;
    }

    const mission = await this.prisma.mission.create({
      data: {
        id: `mission_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        authorClientId: userId,
        title: dto.title,
        description: dto.description || '',
        categoryId,
        locationAddress: dto.address || dto.city || null,
        locationLat: 0, // TODO: géolocalisation réelle
        locationLng: 0, // TODO: géolocalisation réelle
        priceType: dto.hourlyRate ? 'HOURLY' : 'FIXED',
        budgetMin: dto.hourlyRate || 0,
        budgetMax: dto.hourlyRate || 0,
        startAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endAt: dto.endsAt ? new Date(dto.endsAt) : null,
        status: MissionStatus.OPEN,
        updatedAt: new Date(),
      },
      select: missionSelect,
    });

    return this.mapToResponse(mission);
  }

  async getMissionsForEmployer(userId: string): Promise<MissionResponse[]> {
    // Vérifier que l'utilisateur existe et a le rôle EMPLOYER
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.EMPLOYER && user.userProfile?.role !== UserRole.ADMIN) {
      if (isDevEnvironment()) {
        this.logger.warn(`[DEV MODE] User ${userId} is not EMPLOYER - returning empty missions list`);
        return [];
      }
      throw new ForbiddenException('Accès réservé aux employeurs WorkOn');
    }

    const missions = await this.prisma.mission.findMany({
      where: { authorClientId: userId },
      orderBy: { createdAt: 'desc' },
      select: missionSelect,
    });

    return missions.map((mission) => this.mapToResponse(mission));
  }

  async getMissionById(userId: string, missionId: string): Promise<MissionResponse> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: missionSelect,
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Vérifier que l'utilisateur a accès à cette mission
    const isAuthor = mission.authorClientId === userId;
    const isAssignee = mission.assigneeWorkerId === userId;

    if (!isAuthor && !isAssignee) {
      throw new ForbiddenException("Vous n'avez pas accès à cette mission");
    }

    return this.mapToResponse(mission);
  }

  async getAvailableMissionsForWorker(
    userId: string,
    filters: ListAvailableMissionsDto,
  ): Promise<MissionResponse[]> {
    // Vérifier que l'utilisateur existe et a le rôle WORKER
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.WORKER) {
      if (isDevEnvironment()) {
        this.logger.warn(`[DEV MODE] User ${userId} is not WORKER - returning missions anyway`);
      } else {
        throw new ForbiddenException('Accès réservé aux workers WorkOn');
      }
    }

    const whereClause: Prisma.MissionWhereInput = {
      status: MissionStatus.OPEN,
    };

    if (filters.city) {
      whereClause.locationAddress = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.category) {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [
            { id: filters.category },
            { name: { equals: filters.category, mode: 'insensitive' } },
          ],
        },
      });
      if (category) {
        whereClause.categoryId = category.id;
      }
    }

    const missions = await this.prisma.mission.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: missionSelect,
    });

    return missions.map((mission) => this.mapToResponse(mission));
  }

  async updateMissionStatus(
    userId: string,
    missionId: string,
    dto: UpdateMissionStatusDto,
  ): Promise<MissionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkId: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.EMPLOYER && user.userProfile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès réservé aux employeurs WorkOn');
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        ...missionSelect,
        assigneeWorker: {
          select: {
            clerkId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.authorClientId !== userId) {
      throw new ForbiddenException('Impossible de modifier une mission qui ne vous appartient pas');
    }

    // Valider la transition de statut
    this.validateStatusTransition(mission.status, dto.status);

    const oldStatus = mission.status;
    const newStatus = dto.status;

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: newStatus, updatedAt: new Date() },
      select: missionSelect,
    });

    // Créer une notification pour le worker (si assigné)
    if (mission.assigneeWorker?.clerkId) {
      try {
        await this.notificationsService.createForMissionStatusChange(
          missionId,
          oldStatus,
          newStatus,
          mission.assigneeWorker.clerkId,
        );
      } catch (error) {
        this.logger.error(`Failed to create notification: ${error.message}`);
      }
    }

    return this.mapToResponse(updated);
  }

  async reserveMission(
    userId: string,
    missionId: string,
  ): Promise<MissionResponse> {
    // Vérifier que l'utilisateur est un worker
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.WORKER) {
      throw new ForbiddenException('Seuls les workers peuvent réserver des missions');
    }

    // Récupérer la mission avec les infos de l'auteur
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        ...missionSelect,
        authorClient: {
          select: {
            clerkId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Vérifier que la mission est disponible
    if (mission.status !== MissionStatus.OPEN) {
      throw new BadRequestException(
        'Cette mission ne peut plus être réservée (statut actuel: ' +
          mission.status +
          ')',
      );
    }

    // Réserver la mission (atomique) - utiliser MATCHED au lieu de RESERVED
    const updated = await this.prisma.mission.update({
      where: {
        id: missionId,
        status: MissionStatus.OPEN,
      },
      data: {
        status: MissionStatus.MATCHED,
        assigneeWorkerId: userId,
        updatedAt: new Date(),
      },
      select: missionSelect,
    });

    // Créer une notification pour l'auteur
    if (mission.authorClient?.clerkId) {
      try {
        await this.notificationsService.createForMissionStatusChange(
          missionId,
          MissionStatus.OPEN,
          MissionStatus.MATCHED,
          mission.authorClient.clerkId,
        );
      } catch (error) {
        this.logger.error(`Failed to create notification: ${error.message}`);
      }
    }

    return this.mapToResponse(updated);
  }

  async getMissionsForWorker(userId: string): Promise<MissionResponse[]> {
    // Vérifier que l'utilisateur existe et a le rôle WORKER
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.WORKER) {
      if (isDevEnvironment()) {
        this.logger.warn(`[DEV MODE] User ${userId} is not WORKER - returning empty missions list`);
        return [];
      }
      throw new ForbiddenException('Accès réservé aux workers WorkOn');
    }

    const missions = await this.prisma.mission.findMany({
      where: { assigneeWorkerId: userId },
      orderBy: { createdAt: 'desc' },
      select: missionSelect,
    });

    return missions.map((mission) => this.mapToResponse(mission));
  }

  async getMissionFeed(
    userId: string,
    filters: {
      category?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      maxDistance?: number;
    },
  ): Promise<any[]> {
    // Vérifier que l'utilisateur existe et a le rôle WORKER
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userProfile: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.userProfile?.role !== UserRole.WORKER) {
      if (isDevEnvironment()) {
        this.logger.warn(`[DEV MODE] User ${userId} is not WORKER - returning empty feed`);
        return [];
      }
      throw new ForbiddenException('Accès réservé aux workers WorkOn');
    }

    const where: Prisma.MissionWhereInput = {
      status: MissionStatus.OPEN,
    };

    if (filters.category) {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [
            { id: filters.category },
            { name: { equals: filters.category, mode: 'insensitive' } },
          ],
        },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (filters.city) {
      where.locationAddress = { contains: filters.city, mode: 'insensitive' };
    }

    const missions = await this.prisma.mission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        ...missionSelect,
        authorClient: {
          select: {
            userProfile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculer la distance pour chaque mission
    const missionsWithDistance = missions.map((mission) => {
      let distance: number | null = null;
      const lat = mission.locationLat;
      const lng = mission.locationLng;

      if (
        filters.latitude &&
        filters.longitude &&
        lat !== null &&
        lng !== null
      ) {
        distance = this.calculateDistance(
          filters.latitude,
          filters.longitude,
          lat,
          lng,
        );
      }

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        categoryId: mission.categoryId,
        locationAddress: mission.locationAddress,
        budgetMin: mission.budgetMin,
        budgetMax: mission.budgetMax,
        priceType: mission.priceType,
        startAt: mission.startAt ? mission.startAt.toISOString() : null,
        endAt: mission.endAt ? mission.endAt.toISOString() : null,
        status: mission.status,
        authorClientId: mission.authorClientId,
        authorName: mission.authorClient?.userProfile?.name || null,
        distance,
        latitude: lat,
        longitude: lng,
        createdAt: mission.createdAt.toISOString(),
      };
    });

    // Filtrer par distance si spécifié
    let filtered = missionsWithDistance;
    if (filters.maxDistance && filters.latitude && filters.longitude) {
      filtered = missionsWithDistance.filter(
        (m) => m.distance === null || m.distance <= filters.maxDistance!,
      );
    }

    // Trier par distance (les plus proches en premier)
    filtered.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return filtered;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private validateStatusTransition(
    currentStatus: MissionStatus,
    newStatus: MissionStatus,
  ): void {
    const validTransitions: Record<MissionStatus, MissionStatus[]> = {
      [MissionStatus.DRAFT]: [MissionStatus.OPEN, MissionStatus.CANCELLED],
      [MissionStatus.OPEN]: [MissionStatus.MATCHED, MissionStatus.CANCELLED],
      [MissionStatus.MATCHED]: [
        MissionStatus.IN_PROGRESS,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.IN_PROGRESS]: [MissionStatus.COMPLETED, MissionStatus.CANCELLED],
      [MissionStatus.COMPLETED]: [],
      [MissionStatus.CANCELLED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Transition invalide: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  private mapToResponse(mission: MissionRecord): MissionResponse {
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      categoryId: mission.categoryId,
      locationAddress: mission.locationAddress,
      budgetMin: mission.budgetMin,
      budgetMax: mission.budgetMax,
      startAt: mission.startAt,
      endAt: mission.endAt,
      status: mission.status,
      authorClientId: mission.authorClientId,
      assigneeWorkerId: mission.assigneeWorkerId,
      priceType: mission.priceType,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    };
  }
}


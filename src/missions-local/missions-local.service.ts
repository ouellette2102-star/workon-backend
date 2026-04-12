import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MissionsLocalRepository } from './missions-local.repository';
import { CreateMissionDto } from './dto/create-mission.dto';
import { NearbyMissionsQueryDto } from './dto/nearby-missions-query.dto';
import { MissionsMapQueryDto } from './dto/missions-map-query.dto';
import { InvoiceService } from '../payments/invoice.service';
import { ReputationService } from '../reputation/reputation.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractsService } from '../contracts/contracts.service';

export interface ExpressDispatchDto {
  category: string;
  description: string;
  city: string;
  budget: number;
  latitude: number;
  longitude: number;
}

export interface ExpressDispatchResult {
  missionId: string;
  candidatesNotified: number;
}

/**
 * Missions Service - Business logic for mission management
 *
 * Handles mission CRUD, status transitions, authorization.
 * Auto-creates invoice on mission completion.
 */
@Injectable()
export class MissionsLocalService {
  private readonly logger = new Logger(MissionsLocalService.name);

  constructor(
    private readonly missionsRepository: MissionsLocalRepository,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    private readonly reputationService: ReputationService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Create a new mission
   * 
   * @param createMissionDto Mission data
   * @param userId Creator's user ID (employer or residential_client)
   * @param userRole Creator's role
   */
  async create(
    createMissionDto: CreateMissionDto,
    userId: string,
    userRole: string,
  ) {
    // Only employers and residential clients can create missions
    if (userRole !== 'employer' && userRole !== 'residential_client') {
      throw new ForbiddenException(
        'Only employers and residential clients can create missions',
      );
    }

    const mission = await this.missionsRepository.create(
      createMissionDto,
      userId,
    );

    this.logger.log(`Mission created: ${mission.id} by user ${userId}`);

    return mission;
  }

  /**
   * Find nearby open missions
   * 
   * @param query Location and radius
   * @param userRole User role (must be worker)
   */
  async findNearby(query: NearbyMissionsQueryDto, userRole: string) {
    // Only workers can search for missions
    if (userRole !== 'worker') {
      throw new ForbiddenException('Only workers can search for nearby missions');
    }

    const missions = await this.missionsRepository.findNearby(
      query.latitude,
      query.longitude,
      query.radiusKm || 10,
      {
        sort: (query as any).sort,
        category: (query as any).category,
        query: (query as any).query,
        priceMin: (query as any).priceMin,
        priceMax: (query as any).priceMax,
      },
    );

    this.logger.log(
      `Found ${missions.length} missions within ${query.radiusKm}km`,
    );

    return missions;
  }

  /**
   * Worker accepts a mission
   * 
   * @param missionId Mission ID
   * @param userId Worker's user ID
   * @param userRole User role (must be worker)
   */
  async accept(missionId: string, userId: string, userRole: string) {
    // Only workers can accept missions
    if (userRole !== 'worker') {
      throw new ForbiddenException('Only workers can accept missions');
    }

    // Atomic check-and-update: only succeeds if mission is still open and unassigned
    const result = await this.prisma.localMission.updateMany({
      where: {
        id: missionId,
        status: 'open',
        assignedToUserId: null,
      },
      data: {
        status: 'assigned',
        assignedToUserId: userId,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Either mission doesn't exist, or it's not open, or already assigned
      const mission = await this.missionsRepository.findById(missionId);
      if (!mission) {
        throw new NotFoundException('Mission not found');
      }
      if (mission.status !== 'open') {
        throw new BadRequestException(
          `Mission is not available (current status: ${mission.status})`,
        );
      }
      if (mission.assignedToUserId) {
        throw new BadRequestException('Mission is already assigned to a worker');
      }
      // Fallback — shouldn't reach here
      throw new BadRequestException('Unable to accept mission');
    }

    this.logger.log(`Mission ${missionId} accepted by worker ${userId}`);

    // Auto-create contract for worker protection
    try {
      const mission = await this.missionsRepository.findById(missionId);
      if (mission) {
        await this.contractsService.createLocalContract(
          missionId,
          mission.createdByUserId,
          userId,
          mission.price,
        );
      }
    } catch (err) {
      // Don't fail mission acceptance if contract creation fails
      this.logger.warn(
        `Failed to auto-create contract for mission ${missionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fetch and return the updated mission
    return this.missionsRepository.findById(missionId);
  }

  /**
   * PR-S5: Start a mission (assigned -> in_progress)
   * 
   * @param missionId Mission ID
   * @param userId Worker's user ID
   * @param userRole User role (must be worker)
   */
  async start(missionId: string, userId: string, userRole: string) {
    // Only workers can start missions
    if (userRole !== 'worker') {
      throw new ForbiddenException('Only workers can start missions');
    }

    const mission = await this.missionsRepository.findById(missionId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Only assigned worker can start
    if (mission.assignedToUserId !== userId) {
      throw new ForbiddenException('Only the assigned worker can start this mission');
    }

    // Must be in assigned status
    if (mission.status !== 'assigned') {
      throw new BadRequestException(
        `Cannot start mission (current status: ${mission.status})`,
      );
    }

    const updated = await this.missionsRepository.updateStatus(
      missionId,
      'in_progress',
    );

    this.logger.log(`Mission ${missionId} started by worker ${userId}`);

    return updated;
  }

  /**
   * Mark mission as completed
   * 
   * @param missionId Mission ID
   * @param userId User ID (worker or creator)
   * @param userRole User role
   */
  async complete(missionId: string, userId: string, _userRole: string) {
    const mission = await this.missionsRepository.findById(missionId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Only assigned worker or mission creator can complete
    const isWorker = mission.assignedToUserId === userId;
    const isCreator = mission.createdByUserId === userId;

    if (!isWorker && !isCreator) {
      throw new ForbiddenException(
        'Only the assigned worker or mission creator can mark as completed',
      );
    }

    if (mission.status === 'completed') {
      throw new BadRequestException('Mission is already completed');
    }

    if (mission.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled mission');
    }

    const updated = await this.missionsRepository.updateStatus(
      missionId,
      'completed',
    );

    this.logger.log(`Mission ${missionId} completed by user ${userId}`);

    // Auto-create invoice for the employer to pay
    try {
      const checkout = await this.invoiceService.createCheckoutSession(
        missionId,
        mission.createdByUserId,
      );
      this.logger.log(`Auto-created invoice ${checkout.invoiceId} for completed mission ${missionId}`);
    } catch (err) {
      // Don't fail mission completion if invoice creation fails (e.g. Stripe not configured)
      this.logger.warn(`Failed to auto-create invoice for mission ${missionId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Recompute reputation for both sides of the transaction. Failures must
    // not block mission completion — reputation is eventually consistent.
    for (const participantId of [mission.assignedToUserId, mission.createdByUserId].filter(Boolean) as string[]) {
      try {
        await this.reputationService.recomputeForLocalUser(participantId);
      } catch (err) {
        this.logger.warn(`Failed to recompute reputation for ${participantId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return updated;
  }

  /**
   * Cancel a mission
   * 
   * @param missionId Mission ID
   * @param userId User ID (must be creator)
   * @param userRole User role
   */
  async cancel(missionId: string, userId: string, userRole: string) {
    const mission = await this.missionsRepository.findById(missionId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Only creator or admin can cancel
    const isCreator = mission.createdByUserId === userId;
    const isAdmin = userRole === 'admin';

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        'Only the mission creator or admin can cancel',
      );
    }

    if (mission.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed mission');
    }

    if (mission.status === 'cancelled') {
      throw new BadRequestException('Mission is already cancelled');
    }

    const updated = await this.missionsRepository.updateStatus(
      missionId,
      'cancelled',
      null, // Clear assignedToUserId
    );

    this.logger.log(`Mission ${missionId} cancelled by user ${userId}`);

    return updated;
  }

  /**
   * Get mission by ID
   */
  async findById(missionId: string) {
    const mission = await this.missionsRepository.findById(missionId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return mission;
  }

  /**
   * Get missions created by a user
   */
  async findMyMissions(userId: string) {
    return this.missionsRepository.findByCreator(userId);
  }

  /**
   * Get missions assigned to a worker
   */
  async findMyAssignments(userId: string) {
    return this.missionsRepository.findByWorker(userId);
  }

  /**
   * Find missions within a bounding box (for map view)
   * 
   * @param query Bounding box parameters
   * @returns Lightweight mission list for map pins
   */
  async findByBbox(query: MissionsMapQueryDto) {
    // Validate bbox: north must be > south
    if (query.north <= query.south) {
      throw new BadRequestException(
        'Invalid bounding box: north must be greater than south',
      );
    }

    // Validate bbox: east must be > west (simplified, doesn't handle antimeridian)
    if (query.east <= query.west) {
      throw new BadRequestException(
        'Invalid bounding box: east must be greater than west',
      );
    }

    const missions = await this.missionsRepository.findByBbox(
      query.north,
      query.south,
      query.east,
      query.west,
      query.status || 'open',
      query.category,
      query.limit || 200,
    );

    this.logger.log(
      `Map query: found ${missions.length} missions in bbox`,
    );

    return {
      missions,
      count: missions.length,
      bbox: {
        north: query.north,
        south: query.south,
        east: query.east,
        west: query.west,
      },
    };
  }

  /**
   * Express Dispatch — the core WorkOn feature.
   *
   * 1. Creates a mission with status 'open'
   * 2. Finds nearby workers within 25km using Haversine
   * 3. Returns the mission ID and count of notified workers
   *
   * This is the "Uber model": first worker to accept gets the mission.
   */
  async expressDispatch(
    dto: ExpressDispatchDto,
    userId: string,
    userRole: string,
  ): Promise<ExpressDispatchResult> {
    // Only employers and residential clients can dispatch
    if (userRole !== 'employer' && userRole !== 'residential_client') {
      throw new ForbiddenException(
        'Only employers and residential clients can use Express Dispatch',
      );
    }

    // 1. Create the mission
    const mission = await this.missionsRepository.create(
      {
        title: `Express: ${dto.category || 'Service urgent'}`,
        description: dto.description,
        category: dto.category || 'general',
        price: dto.budget || 50,
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city || 'Montréal',
      } as CreateMissionDto,
      userId,
    );

    this.logger.log(
      `Express mission created: ${mission.id} by user ${userId}`,
    );

    // 2. Find nearby workers (25km radius)
    const radiusKm = 25;
    const nearbyWorkers = await this.prisma.$queryRaw<
      { id: string; firstName: string }[]
    >`
      SELECT id, "firstName"
      FROM local_users
      WHERE role = 'worker'
        AND active = true
        AND id != ${userId}
        AND (
          6371 * acos(
            cos(radians(${dto.latitude}))
            * cos(radians(COALESCE(latitude, 0)))
            * cos(radians(COALESCE(longitude, 0)) - radians(${dto.longitude}))
            + sin(radians(${dto.latitude}))
            * sin(radians(COALESCE(latitude, 0)))
          )
        ) <= ${radiusKm}
      LIMIT 50
    `;

    this.logger.log(
      `Express dispatch: found ${nearbyWorkers.length} workers within ${radiusKm}km`,
    );

    // 3. In-app notifications for nearby workers via LocalNotification
    if (nearbyWorkers.length > 0) {
      const notifTitle = `Nouvelle mission Express`;
      const notifBody = `${dto.category || 'Service urgent'} à ${dto.city || 'proximité'} — ${dto.budget || 50}$`;

      await Promise.allSettled(
        nearbyWorkers.map((w) =>
          this.notificationsService.createLocalNotification(
            w.id,
            'express_dispatch',
            notifTitle,
            notifBody,
            { missionId: mission.id, category: dto.category, budget: dto.budget },
          ),
        ),
      );

      this.logger.log(
        `Express dispatch: ${nearbyWorkers.length} nearby workers notified`,
      );
    }

    return {
      missionId: mission.id,
      candidatesNotified: nearbyWorkers.length,
    };
  }
}


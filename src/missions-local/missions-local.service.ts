import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MissionsLocalRepository } from './missions-local.repository';
import { CreateMissionDto } from './dto/create-mission.dto';
import { NearbyMissionsQueryDto } from './dto/nearby-missions-query.dto';
import { MissionsMapQueryDto } from './dto/missions-map-query.dto';

/**
 * Missions Service - Business logic for mission management
 * 
 * Handles mission CRUD, status transitions, authorization
 */
@Injectable()
export class MissionsLocalService {
  private readonly logger = new Logger(MissionsLocalService.name);

  constructor(
    private readonly missionsRepository: MissionsLocalRepository,
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
   * @param query Location, radius, and optional filters
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
        sort: query.sort,
        category: query.category,
        query: query.query,
      },
    );

    this.logger.log(
      `Found ${missions.length} missions within ${query.radiusKm}km` +
      (query.category ? ` (category: ${query.category})` : '') +
      (query.sort ? ` (sorted by: ${query.sort})` : ''),
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

    const updated = await this.missionsRepository.updateStatus(
      missionId,
      'assigned',
      userId,
    );

    this.logger.log(`Mission ${missionId} accepted by worker ${userId}`);

    return updated;
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
}


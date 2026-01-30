import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';

/**
 * Missions Repository - Data access layer for local missions
 * 
 * Handles geospatial queries using PostgreSQL/PostGIS
 */
@Injectable()
export class MissionsLocalRepository {
  private readonly logger = new Logger(MissionsLocalRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new mission
   */
  async create(createMissionDto: CreateMissionDto, createdByUserId: string) {
    this.logger.log(`Creating mission: ${createMissionDto.title} for user: ${createdByUserId}`);

    const id = `lm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const mission = await this.prisma.localMission.create({
        data: {
          id,
          title: createMissionDto.title,
          description: createMissionDto.description,
          category: createMissionDto.category,
          price: createMissionDto.price,
          latitude: createMissionDto.latitude,
          longitude: createMissionDto.longitude,
          city: createMissionDto.city,
          address: createMissionDto.address,
          createdByUserId,
          status: 'open',
          updatedAt: new Date(),
        },
      });
      this.logger.log(`Mission created successfully: ${mission.id}`);
      return mission;
    } catch (error) {
      this.logger.error(`Mission creation FAILED: ${error.message}`, error.stack);
      this.logger.error(`Failed data: userId=${createdByUserId}, title=${createMissionDto.title}`);
      throw error;
    }
  }

  /**
   * Find mission by ID
   */
  async findById(id: string) {
    return this.prisma.localMission.findUnique({
      where: { id },
    });
  }

  /**
   * Find nearby open missions using Haversine formula
   * 
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusKm Search radius in kilometers
   */
  async findNearby(latitude: number, longitude: number, radiusKm: number) {
    // Use raw SQL for geospatial distance calculation
    // Haversine formula: calculates distance between two lat/lng points
    // Fixed: Using subquery instead of HAVING (which requires GROUP BY)
    const missions = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM (
        SELECT 
          id,
          title,
          description,
          category,
          status,
          price,
          latitude,
          longitude,
          city,
          address,
          "createdByUserId",
          "assignedToUserId",
          "createdAt",
          "updatedAt",
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${latitude})) 
                * cos(radians(latitude)) 
                * cos(radians(longitude) - radians(${longitude})) 
                + sin(radians(${latitude})) 
                * sin(radians(latitude))
              ))
            )
          ) AS "distanceKm"
        FROM local_missions
        WHERE status = 'open'
      ) AS nearby
      WHERE "distanceKm" <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `;

    return missions;
  }

  /**
   * Update mission status
   */
  async updateStatus(
    id: string,
    status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
    assignedToUserId?: string | null,
  ) {
    return this.prisma.localMission.update({
      where: { id },
      data: {
        status,
        ...(assignedToUserId !== undefined && { assignedToUserId }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get missions created by a user
   */
  async findByCreator(createdByUserId: string) {
    this.logger.log(`findByCreator called for userId: ${createdByUserId}`);
    try {
      const result = await this.prisma.localMission.findMany({
        where: { createdByUserId },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`findByCreator returned ${result.length} missions`);
      return result;
    } catch (error) {
      this.logger.error(`findByCreator FAILED: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get missions assigned to a worker
   */
  async findByWorker(assignedToUserId: string) {
    this.logger.log(`findByWorker called for userId: ${assignedToUserId}`);
    try {
      const result = await this.prisma.localMission.findMany({
        where: { assignedToUserId },
        orderBy: { updatedAt: 'desc' },
      });
      this.logger.log(`findByWorker returned ${result.length} missions`);
      return result;
    } catch (error) {
      this.logger.error(`findByWorker FAILED: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find missions within a bounding box (for map view)
   * 
   * More efficient than radius for map rendering.
   * Uses simple lat/lng comparison (no Haversine needed for bbox).
   * 
   * @param north Northern boundary latitude
   * @param south Southern boundary latitude
   * @param east Eastern boundary longitude
   * @param west Western boundary longitude
   * @param status Filter by status (default: 'open')
   * @param category Filter by category (optional)
   * @param limit Maximum results (default: 200)
   */
  async findByBbox(
    north: number,
    south: number,
    east: number,
    west: number,
    status: string = 'open',
    category?: string,
    limit: number = 200,
  ) {
    this.logger.log(
      `Finding missions in bbox: N=${north}, S=${south}, E=${east}, W=${west}`,
    );

    // Build where clause
    const where: any = {
      latitude: {
        gte: south,
        lte: north,
      },
      longitude: {
        gte: west,
        lte: east,
      },
      status: status as any,
    };

    // Add category filter if provided
    if (category) {
      where.category = category;
    }

    const missions = await this.prisma.localMission.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        status: true,
        price: true,
        city: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500), // Hard cap at 500
    });

    this.logger.log(`Found ${missions.length} missions in bbox`);

    return missions;
  }
}


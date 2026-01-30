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
   * Using raw SQL to avoid potential Prisma client issues
   */
  async create(createMissionDto: CreateMissionDto, createdByUserId: string) {
    this.logger.log(`Creating mission: ${createMissionDto.title} for user: ${createdByUserId}`);

    const id = `lm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    try {
      // Use raw SQL INSERT to avoid Prisma ORM issues
      await this.prisma.$executeRaw`
        INSERT INTO local_missions (
          id, title, description, category, status, price,
          latitude, longitude, city, address,
          "createdByUserId", "createdAt", "updatedAt"
        ) VALUES (
          ${id},
          ${createMissionDto.title},
          ${createMissionDto.description},
          ${createMissionDto.category},
          'open',
          ${createMissionDto.price},
          ${createMissionDto.latitude},
          ${createMissionDto.longitude},
          ${createMissionDto.city},
          ${createMissionDto.address || null},
          ${createdByUserId},
          ${now},
          ${now}
        )
      `;

      // Fetch and return the created mission
      const missions = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM local_missions WHERE id = ${id}
      `;
      
      const mission = missions[0];
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
   * @param options Optional filters: sort, category, query
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    options?: {
      sort?: 'proximity' | 'date' | 'price';
      category?: string;
      query?: string;
    },
  ) {
    const { sort = 'proximity', category, query } = options || {};

    // Use raw SQL for geospatial distance calculation
    // Haversine formula: calculates distance between two lat/lng points
    // Fixed: Using subquery instead of HAVING (which requires GROUP BY)
    let missions = await this.prisma.$queryRaw<any[]>`
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
      LIMIT 100
    `;

    // Apply filters in JavaScript (safe and simple)
    if (category) {
      missions = missions.filter(m => m.category === category);
    }

    if (query) {
      const q = query.toLowerCase();
      missions = missions.filter(
        m =>
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q),
      );
    }

    // Apply sorting
    switch (sort) {
      case 'date':
        missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price':
        missions.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'proximity':
      default:
        // Already sorted by distance in SQL
        break;
    }

    // Limit to 50 after filtering
    return missions.slice(0, 50);
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
   * Using raw SQL to avoid potential Prisma client issues
   */
  async findByCreator(createdByUserId: string) {
    this.logger.log(`findByCreator called for userId: ${createdByUserId}`);
    try {
      // Use raw SQL like findNearby to avoid Prisma ORM issues
      const result = await this.prisma.$queryRaw<any[]>`
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
          "updatedAt"
        FROM local_missions
        WHERE "createdByUserId" = ${createdByUserId}
        ORDER BY "createdAt" DESC
      `;
      this.logger.log(`findByCreator returned ${result.length} missions`);
      return result;
    } catch (error) {
      this.logger.error(`findByCreator FAILED: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get missions assigned to a worker
   * Using raw SQL to avoid potential Prisma client issues
   */
  async findByWorker(assignedToUserId: string) {
    this.logger.log(`findByWorker called for userId: ${assignedToUserId}`);
    try {
      // Use raw SQL like findNearby to avoid Prisma ORM issues
      const result = await this.prisma.$queryRaw<any[]>`
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
          "updatedAt"
        FROM local_missions
        WHERE "assignedToUserId" = ${assignedToUserId}
        ORDER BY "updatedAt" DESC
      `;
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


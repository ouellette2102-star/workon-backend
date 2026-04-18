import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    this.logger.log(`Creating mission: ${createMissionDto.title}`);

    const id = `lm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    return this.prisma.localMission.create({
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
  }

  /**
   * Find mission by ID (includes contract if exists)
   */
  async findById(id: string) {
    return this.prisma.localMission.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true,
            status: true,
            amount: true,
            signedByWorker: true,
            signedByEmployer: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Find nearby open missions using Haversine formula
   * 
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusKm Search radius in kilometers
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    options?: { sort?: string; category?: string; query?: string; priceMin?: number; priceMax?: number },
  ) {
    const priceMin = options?.priceMin ?? 0;
    const priceMax = options?.priceMax ?? 999999;

    // Compose WHERE filters dynamically while keeping values parameterized.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`lm.status = 'open'`,
      Prisma.sql`lm.price >= ${priceMin}`,
      Prisma.sql`lm.price <= ${priceMax}`,
    ];

    if (options?.category) {
      conditions.push(Prisma.sql`lm.category = ${options.category}`);
    }
    if (options?.query) {
      const searchPattern = `%${options.query}%`;
      conditions.push(
        Prisma.sql`(lm.title ILIKE ${searchPattern} OR lm.description ILIKE ${searchPattern})`,
      );
    }
    const whereClause = Prisma.join(conditions, ' AND ');

    // Dynamic ORDER BY — only whitelisted sort keys reach SQL.
    //
    // Phase 3: active boosts (isUrgent within window, or boostedUntil in
    // the future) float above everything else. Ties broken by the user-
    // selected sort. This is the paid-acceleration surface.
    const boostPriority = Prisma.sql`
      CASE
        WHEN ("isUrgent" = true AND ("urgentUntil" IS NULL OR "urgentUntil" > NOW())) THEN 2
        WHEN ("boostedUntil" IS NOT NULL AND "boostedUntil" > NOW()) THEN 1
        ELSE 0
      END DESC
    `;

    let tieBreaker: Prisma.Sql;
    switch (options?.sort) {
      case 'price':
        tieBreaker = Prisma.sql`price DESC`;
        break;
      case 'date':
        tieBreaker = Prisma.sql`"createdAt" DESC`;
        break;
      case 'trust':
        tieBreaker = Prisma.sql`"creatorTrustScore" DESC NULLS LAST, "distanceKm" ASC`;
        break;
      case 'distance':
      default:
        tieBreaker = Prisma.sql`"distanceKm" ASC`;
    }

    const orderBy = Prisma.sql`${boostPriority}, ${tieBreaker}`;

    const missions = await this.prisma.$queryRaw<any[]>`
      WITH distances AS (
        SELECT
          lm.id,
          lm.title,
          lm.description,
          lm.category,
          lm.status,
          lm.price,
          lm.latitude,
          lm.longitude,
          lm.city,
          lm.address,
          lm."createdByUserId",
          lm."assignedToUserId",
          lm."createdAt",
          lm."updatedAt",
          lm."isUrgent",
          lm."urgentUntil",
          lm."boostedUntil",
          lu."trustScore"    AS "creatorTrustScore",
          lu."trustTier"     AS "creatorTrustTier",
          lu."ratingAverage" AS "creatorRatingAverage",
          6371 * acos(
            LEAST(1.0,
              cos(radians(${latitude}))
              * cos(radians(lm.latitude))
              * cos(radians(lm.longitude) - radians(${longitude}))
              + sin(radians(${latitude}))
              * sin(radians(lm.latitude))
            )
          ) AS "distanceKm"
        FROM local_missions lm
        LEFT JOIN local_users lu ON lu.id = lm."createdByUserId"
        WHERE ${whereClause}
      )
      SELECT * FROM distances
      WHERE "distanceKm" <= ${radiusKm}
      ORDER BY ${orderBy}
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
    return this.prisma.localMission.findMany({
      where: { createdByUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get missions assigned to a worker
   */
  async findByWorker(assignedToUserId: string) {
    return this.prisma.localMission.findMany({
      where: { assignedToUserId },
      orderBy: { updatedAt: 'desc' },
    });
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
        boostedUntil: true,
        isUrgent: true,
        urgentUntil: true,
      },
      // Boost-priority sort: active urgent first, then boosted, then date.
      // Evaluated vs current time in the service layer after fetch.
      orderBy: [
        { isUrgent: 'desc' },
        { boostedUntil: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      take: Math.min(limit, 500), // Hard cap at 500
    });

    this.logger.log(`Found ${missions.length} missions in bbox`);

    return missions;
  }
}


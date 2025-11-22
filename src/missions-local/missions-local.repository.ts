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
    this.logger.log(`Creating mission: ${createMissionDto.title}`);

    const id = `lm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const missions = await this.prisma.$queryRaw<any[]>`
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
            cos(radians(${latitude})) 
            * cos(radians(latitude)) 
            * cos(radians(longitude) - radians(${longitude})) 
            + sin(radians(${latitude})) 
            * sin(radians(latitude))
          )
        ) AS "distanceKm"
      FROM local_missions
      WHERE status = 'open'
      HAVING (
        6371 * acos(
          cos(radians(${latitude})) 
          * cos(radians(latitude)) 
          * cos(radians(longitude) - radians(${longitude})) 
          + sin(radians(${latitude})) 
          * sin(radians(latitude))
        )
      ) <= ${radiusKm}
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
}


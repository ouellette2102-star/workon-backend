import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMissionsQueryDto } from './dto/get-missions.query.dto';
import { MissionPinDto, MissionDetailDto, MissionsHealthDto } from './dto/mission-pin.dto';

@Injectable()
export class MissionsMapService {
  private readonly logger = new Logger(MissionsMapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get missions for map display (pins)
   */
  async getMissions(query: GetMissionsQueryDto): Promise<MissionPinDto[]> {
    const { status, category, city, lat, lng, radiusKm, limit } = query;

    // Build where clause
    const where: any = {};

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by city
    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    // Geo filtering (bounding box approximation)
    if (lat !== undefined && lng !== undefined && radiusKm) {
      // Approximate degrees per km at given latitude
      const latDelta = radiusKm / 111; // ~111km per degree latitude
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

      where.latitude = {
        gte: lat - latDelta,
        lte: lat + latDelta,
      };
      where.longitude = {
        gte: lng - lngDelta,
        lte: lng + lngDelta,
      };
    }

    const missions = await this.prisma.localMission.findMany({
      where,
      take: limit || 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        city: true,
        price: true,
        status: true,
        createdAt: true,
      },
    });

    this.logger.debug(`Found ${missions.length} missions for map`);

    return missions.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      latitude: m.latitude,
      longitude: m.longitude,
      city: m.city,
      price: m.price,
      status: m.status,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Get mission by ID
   */
  async getMissionById(id: string): Promise<MissionDetailDto> {
    const mission = await this.prisma.localMission.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        latitude: true,
        longitude: true,
        city: true,
        address: true,
        price: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      category: mission.category,
      latitude: mission.latitude,
      longitude: mission.longitude,
      city: mission.city,
      address: mission.address,
      price: mission.price,
      status: mission.status,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    };
  }

  /**
   * Get missions health status
   */
  async getHealth(): Promise<MissionsHealthDto> {
    const [totalMissions, openMissions] = await Promise.all([
      this.prisma.localMission.count(),
      this.prisma.localMission.count({ where: { status: 'open' } }),
    ]);

    return {
      totalMissions,
      openMissions,
      timestamp: new Date().toISOString(),
    };
  }
}


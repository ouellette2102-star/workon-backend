import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WorkerBadgeDto,
  WorkerProfileResponseDto,
  WorkersListResponseDto,
} from './dto/worker-profile-response.dto';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/profiles/workers
   *
   * Returns a paginated list of active workers.
   * Public endpoint — no authentication required.
   * Uses LocalUser (active auth system).
   */
  async getWorkers(params: {
    city?: string;
    category?: string;
    limit?: number;
    page?: number;
  }): Promise<WorkersListResponseDto> {
    const limit = Math.min(params.limit ?? 20, 50);
    const page = Math.max(params.page ?? 1, 1);
    const skip = (page - 1) * limit;

    this.logger.log(
      `Fetching workers: city=${params.city}, limit=${limit}, page=${page}`,
    );

    const where: Record<string, unknown> = {
      role: 'worker',
      active: true,
      deletedAt: null,
    };

    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }

    const [total, workers] = await Promise.all([
      this.prisma.localUser.count({ where }),
      this.prisma.localUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          city: true,
          pictureUrl: true,
          createdAt: true,
          trustTier: true,
          assignedMissions: {
            where: { status: 'completed' },
            select: { id: true },
          },
        },
      }),
    ]);

    const result: WorkerProfileResponseDto[] = workers.map((w) => {
      const completedCount = w.assignedMissions?.length ?? 0;
      const badges = this.computeBadges(0, completedCount, 0, w.trustTier);

      return {
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        fullName: `${w.firstName} ${w.lastName}`.trim(),
        city: w.city ?? undefined,
        photoUrl: w.pictureUrl ?? undefined,
        averageRating: 0,
        completionPercentage: this.computeCompletionPct(completedCount),
        reviewCount: 0,
        completedMissions: completedCount,
        badges,
        hourlyRate: undefined,
      };
    });

    return { workers: result, total, page, limit };
  }

  /**
   * GET /api/v1/profiles/workers/:id
   */
  async getWorkerById(workerId: string): Promise<WorkerProfileResponseDto> {
    const w = await this.prisma.localUser.findFirst({
      where: { id: workerId, role: 'worker', active: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        pictureUrl: true,
        trustTier: true,
        createdAt: true,
        assignedMissions: {
          where: { status: 'completed' },
          select: { id: true },
        },
      },
    });

    if (!w) {
      throw new NotFoundException('Travailleur introuvable');
    }

    const completedCount = w.assignedMissions?.length ?? 0;

    return {
      id: w.id,
      firstName: w.firstName,
      lastName: w.lastName,
      fullName: `${w.firstName} ${w.lastName}`.trim(),
      city: w.city ?? undefined,
      photoUrl: w.pictureUrl ?? undefined,
      averageRating: 0,
      completionPercentage: this.computeCompletionPct(completedCount),
      reviewCount: 0,
      completedMissions: completedCount,
      badges: this.computeBadges(0, completedCount, 0, w.trustTier),
      hourlyRate: undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────

  private computeBadges(
    avgRating: number,
    completedCount: number,
    reviewCount: number,
    trustTier: string,
  ): WorkerBadgeDto[] {
    const badges: WorkerBadgeDto[] = [];

    if (trustTier === 'VERIFIED' || trustTier === 'PREMIUM') {
      badges.push({ label: 'Fiable', type: 'reliable' });
    }
    if (completedCount >= 5) {
      badges.push({ label: 'Ponctuel', type: 'punctual' });
    }
    if (completedCount >= 30 && trustTier !== 'BASIC') {
      badges.push({ label: 'Top Performer', type: 'top_performer' });
    }

    return badges;
  }

  private computeCompletionPct(completedCount: number): number {
    const base = 70;
    const boost = Math.min(completedCount * 2, 29);
    return Math.min(base + boost, 99);
  }
}

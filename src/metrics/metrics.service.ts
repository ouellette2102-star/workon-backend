import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HOME_STATS_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Metrics Service - Platform metrics and ratios
 *
 * Provides insights into worker/employer distribution.
 * homeStats is cached in-memory (TTL 5 min) to avoid repeated COUNT queries.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private _homeStatsCache: { data: any; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate worker to employer ratio
   * 
   * @param region Optional region filter
   * @returns Ratio metrics
   */
  async calculateRatio(region?: string) {
    this.logger.log(`Calculating ratio for region: ${region || 'global'}`);

    // Build where clause for region filtering
    const whereClause = region ? { city: region } : {};

    // Count users by role
    const [workers, employers, residentialClients] = await Promise.all([
      this.prisma.localUser.count({
        where: { ...whereClause, role: 'worker', active: true },
      }),
      this.prisma.localUser.count({
        where: { ...whereClause, role: 'employer', active: true },
      }),
      this.prisma.localUser.count({
        where: { ...whereClause, role: 'residential_client', active: true },
      }),
    ]);

    // Calculate ratio (avoid division by zero)
    const workerToEmployerRatio =
      employers > 0 ? Number((workers / employers).toFixed(2)) : workers;

    return {
      region: region || null,
      workers,
      employers,
      residentialClients,
      workerToEmployerRatio,
    };
  }

  /**
   * Get home page stats (public metrics for landing page).
   * Cached in-memory with a 5-minute TTL to avoid repeated COUNT queries.
   */
  async getHomeStats() {
    const now = Date.now();
    if (this._homeStatsCache && this._homeStatsCache.expiresAt > now) {
      this.logger.debug('homeStats served from cache');
      return this._homeStatsCache.data;
    }

    const [completedContracts, openServiceCalls, activeWorkers] = await Promise.all([
      this.prisma.localMission.count({ where: { status: 'completed' } }),
      this.prisma.localMission.count({ where: { status: 'open' } }),
      this.prisma.localUser.count({ where: { role: 'worker', active: true } }),
    ]);

    const data = { completedContracts, activeWorkers, openServiceCalls };
    this._homeStatsCache = { data, expiresAt: now + HOME_STATS_TTL_MS };
    this.logger.debug('homeStats computed and cached');
    return data;
  }

  /**
   * Get available regions (cities with users)
   */
  async getAvailableRegions(): Promise<string[]> {
    const regions = await this.prisma.localUser.findMany({
      where: {
        city: { not: null },
        active: true,
      },
      select: { city: true },
      distinct: ['city'],
    });

    return regions.map((r) => r.city).filter(Boolean) as string[];
  }
}


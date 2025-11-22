import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Metrics Service - Platform metrics and ratios
 * 
 * Provides insights into worker/employer distribution
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

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


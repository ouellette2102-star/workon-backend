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

  /**
   * Generate Prometheus metrics exposition format
   * 
   * @param startTime Application start time in milliseconds
   * @returns Prometheus-formatted metrics string
   */
  async getPrometheusMetrics(startTime: number): Promise<string> {
    const now = Date.now();
    const uptime = (now - startTime) / 1000;
    const memUsage = process.memoryUsage();

    // Get business metrics
    const [
      totalUsers,
      activeUsers,
      totalMissions,
      openMissions,
      completedMissions,
    ] = await Promise.all([
      this.prisma.localUser.count(),
      this.prisma.localUser.count({ where: { active: true } }),
      this.prisma.localMission.count(),
      this.prisma.localMission.count({ where: { status: 'open' } }),
      this.prisma.localMission.count({ where: { status: 'completed' } }),
    ]);

    // Build Prometheus format
    const lines: string[] = [
      '# HELP workon_info Application info',
      '# TYPE workon_info gauge',
      `workon_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1`,
      '',
      '# HELP workon_uptime_seconds Application uptime in seconds',
      '# TYPE workon_uptime_seconds gauge',
      `workon_uptime_seconds ${uptime.toFixed(2)}`,
      '',
      '# HELP nodejs_memory_heap_used_bytes Node.js heap used',
      '# TYPE nodejs_memory_heap_used_bytes gauge',
      `nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`,
      '',
      '# HELP nodejs_memory_heap_total_bytes Node.js heap total',
      '# TYPE nodejs_memory_heap_total_bytes gauge',
      `nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`,
      '',
      '# HELP nodejs_memory_rss_bytes Node.js RSS memory',
      '# TYPE nodejs_memory_rss_bytes gauge',
      `nodejs_memory_rss_bytes ${memUsage.rss}`,
      '',
      '# HELP workon_users_total Total number of users',
      '# TYPE workon_users_total gauge',
      `workon_users_total ${totalUsers}`,
      '',
      '# HELP workon_users_active Number of active users',
      '# TYPE workon_users_active gauge',
      `workon_users_active ${activeUsers}`,
      '',
      '# HELP workon_missions_total Total number of missions',
      '# TYPE workon_missions_total gauge',
      `workon_missions_total ${totalMissions}`,
      '',
      '# HELP workon_missions_open Number of open missions',
      '# TYPE workon_missions_open gauge',
      `workon_missions_open ${openMissions}`,
      '',
      '# HELP workon_missions_completed Number of completed missions',
      '# TYPE workon_missions_completed gauge',
      `workon_missions_completed ${completedMissions}`,
      '',
    ];

    return lines.join('\n');
  }
}


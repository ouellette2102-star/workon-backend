import { Controller, Get, Res, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

export interface ServiceCheck {
  status: 'ok' | 'error' | 'degraded';
  latencyMs?: number;
  message?: string;
}

export interface SystemMetrics {
  memoryUsageMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  cpuUsage?: number;
  activeConnections?: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  system?: SystemMetrics;
  checks: {
    database: ServiceCheck;
    stripe: ServiceCheck;
    storage: ServiceCheck;
    signedUrls: ServiceCheck;
  };
}

@ApiTags('Health')
@Controller()
@SkipThrottle() // Exclure les health checks du rate limiting
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // NOTE: /health, /healthz, /readyz sont définis dans main.ts
  // pour garantir qu'ils répondent AVANT le boot complet de NestJS.
  // Ce controller ne définit que les endpoints détaillés sous /api/v1/
  // ============================================

  // ============================================
  // Detailed Health Endpoints (api/v1 prefix)
  // ============================================

  /**
   * GET /api/v1/health
   * Health check complet avec statut de tous les services
   */
  @Get('api/v1/health')
  @ApiOperation({
    summary: 'Health check complet',
    description:
      'Retourne le statut de tous les services (DB, Stripe, Storage, SignedUrls). ' +
      'Public, pas d\'authentification requise.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service en bonne santé ou dégradé',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
        uptime: { type: 'number', example: 3600.5 },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                latencyMs: { type: 'number' },
              },
            },
            stripe: { type: 'object' },
            storage: { type: 'object' },
            signedUrls: { type: 'object' },
          },
        },
      },
    },
  })
  async getHealth(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();
    const checks = {
      database: await this.checkDatabase(),
      stripe: await this.checkStripe(),
      storage: this.checkStorage(),
      signedUrls: this.checkSignedUrls(),
    };

    // Déterminer le statut global
    const statuses = Object.values(checks).map((c) => c.status);
    let globalStatus: 'ok' | 'degraded' | 'error' = 'ok';

    if (statuses.includes('error')) {
      // Si DB down → error, sinon degraded
      globalStatus = checks.database.status === 'error' ? 'error' : 'degraded';
    } else if (statuses.includes('degraded')) {
      globalStatus = 'degraded';
    }

    return {
      status: globalStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: process.uptime(),
      system: this.getSystemMetrics(),
      checks,
    };
  }

  /**
   * Get system metrics (memory, heap)
   */
  private getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    return {
      memoryUsageMB: Math.round(memUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    };
  }

  /**
   * GET /api/v1/ready
   * Detailed readiness check with all services
   */
  @Get('api/v1/ready')
  @ApiOperation({
    summary: 'Detailed readiness probe',
    description:
      'Retourne 200 si le service est prêt à recevoir du trafic, 503 sinon. ' +
      'Inclut le statut de tous les services critiques.',
  })
  @ApiResponse({ status: 200, description: 'Service prêt' })
  @ApiResponse({ status: 503, description: 'Service non prêt' })
  async getReady(@Res() res: Response): Promise<void> {
    const timestamp = new Date().toISOString();

    try {
      // Check critique: Database (timeout 2s)
      const dbCheck = await this.checkDatabase();
      
      // Check Stripe
      const stripeCheck = await this.checkStripe();

      // Check optionnel: Signed URL config
      const signedUrlCheck = this.checkSignedUrls();

      // Database must be OK for readiness
      if (dbCheck.status === 'error') {
        throw new Error('Database not ready');
      }

      res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp,
        uptime: process.uptime(),
        system: this.getSystemMetrics(),
        checks: {
          database: dbCheck,
          stripe: stripeCheck,
          signedUrls: signedUrlCheck,
        },
      });
    } catch (error) {
      this.logger.error(`Readiness check failed: ${(error as Error).message}`);

      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        timestamp,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Check Database connectivity (timeout: 2s)
   */
  private async checkDatabase(): Promise<ServiceCheck> {
    const DB_CHECK_TIMEOUT_MS = 2000;
    
    try {
      const start = Date.now();
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), DB_CHECK_TIMEOUT_MS),
        ),
      ]);
      const latencyMs = Date.now() - start;

      return {
        status: latencyMs > 1000 ? 'degraded' : 'ok',
        latencyMs,
      };
    } catch {
      return { status: 'error', message: 'Connection failed' };
    }
  }

  /**
   * Check Stripe configuration and connectivity
   * PR-02: Enhanced check with API verification
   */
  private async checkStripe(): Promise<ServiceCheck> {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    // Check configuration
    if (!secretKey) {
      return { status: 'error', message: 'STRIPE_SECRET_KEY not configured' };
    }

    if (!webhookSecret) {
      return { status: 'degraded', message: 'STRIPE_WEBHOOK_SECRET not configured' };
    }

    // Verify API connectivity (only in production or if explicitly enabled)
    const verifyApi = this.configService.get<string>('STRIPE_HEALTH_CHECK_API') === 'true';
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    
    if (verifyApi || isProd) {
      try {
        const start = Date.now();
        // Light API call to verify connectivity
        const response = await fetch('https://api.stripe.com/v1/balance', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
          },
        });
        const latencyMs = Date.now() - start;

        if (response.ok) {
          return { status: 'ok', latencyMs };
        } else if (response.status === 401) {
          return { status: 'error', message: 'Invalid API key' };
        } else {
          return { status: 'degraded', message: `API returned ${response.status}`, latencyMs };
        }
      } catch (error) {
        return { status: 'degraded', message: `API unreachable: ${(error as Error).message}` };
      }
    }

    // Configuration OK, API check skipped
    return { status: 'ok', message: 'Config valid (API check skipped)' };
  }

  /**
   * Check Storage (local disk)
   */
  private checkStorage(): ServiceCheck {
    // Storage local toujours disponible
    return { status: 'ok' };
  }

  /**
   * Check Signed URLs configuration
   */
  private checkSignedUrls(): ServiceCheck {
    const secret = this.configService.get<string>('SIGNED_URL_SECRET');

    if (secret) {
      return { status: 'ok' };
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'production') {
      return { status: 'error', message: 'Secret not configured' };
    }

    return { status: 'degraded', message: 'Using default secret (dev only)' };
  }
}

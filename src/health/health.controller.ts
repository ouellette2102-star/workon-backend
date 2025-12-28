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

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: ServiceCheck;
    stripe: ServiceCheck;
    storage: ServiceCheck;
    signedUrls: ServiceCheck;
  };
}

@ApiTags('Health')
@Controller('api/v1')
@SkipThrottle() // Exclure les health checks du rate limiting
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/health
   * Health check complet avec statut de tous les services
   */
  @Get('health')
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
      stripe: this.checkStripe(),
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
      checks,
    };
  }

  /**
   * GET /api/v1/ready
   * Readiness probe pour Railway/K8s
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Retourne 200 si le service est prêt à recevoir du trafic, 503 sinon. ' +
      'Utilisé par Railway pour les health checks.',
  })
  @ApiResponse({ status: 200, description: 'Service prêt' })
  @ApiResponse({ status: 503, description: 'Service non prêt' })
  async getReady(@Res() res: Response): Promise<void> {
    const timestamp = new Date().toISOString();

    try {
      // Check critique: Database
      const start = Date.now();
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 3000),
        ),
      ]);
      const latencyMs = Date.now() - start;

      // Check optionnel: Stripe config
      const stripeOk = !!this.configService.get<string>('STRIPE_SECRET_KEY');

      // Check optionnel: Signed URL config
      const signedUrlOk = !!this.configService.get<string>('SIGNED_URL_SECRET');

      res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp,
        checks: {
          database: { status: 'ok', latencyMs },
          stripe: { status: stripeOk ? 'ok' : 'degraded' },
          signedUrls: { status: signedUrlOk ? 'ok' : 'degraded' },
        },
      });
    } catch (error) {
      this.logger.error(`Readiness check failed: ${(error as Error).message}`);

      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        timestamp,
        checks: {
          database: { status: 'error', message: 'Connection failed' },
        },
      });
    }
  }

  /**
   * Check Database connectivity
   */
  private async checkDatabase(): Promise<ServiceCheck> {
    try {
      const start = Date.now();
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
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
   * Check Stripe configuration
   */
  private checkStripe(): ServiceCheck {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (secretKey && webhookSecret) {
      return { status: 'ok' };
    }

    if (secretKey || webhookSecret) {
      return { status: 'degraded', message: 'Partial configuration' };
    }

    return { status: 'error', message: 'Not configured' };
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

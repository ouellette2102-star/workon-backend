import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface HealthResponse {
  status: string;
  timestamp: string;
  env: string;
  uptime: number;
}

interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
  };
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns service health status. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-11-18T18:00:00.000Z',
        env: 'development',
        uptime: 123.456,
      },
    },
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check endpoint',
    description: 'Checks if the service is ready to handle requests (DB connected). Returns 503 if not ready.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2024-11-18T18:00:00.000Z',
        checks: { database: 'ok' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
    schema: {
      example: {
        status: 'not_ready',
        timestamp: '2024-11-18T18:00:00.000Z',
        checks: { database: 'error' },
        error: 'Database connection failed',
      },
    },
  })
  async getReadiness(@Res() res: Response): Promise<void> {
    const timestamp = new Date().toISOString();

    try {
      // Test DB connection with simple query
      await this.prisma.$queryRaw`SELECT 1`;

      const response: ReadinessResponse = {
        status: 'ready',
        timestamp,
        checks: { database: 'ok' },
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      const response: ReadinessResponse = {
        status: 'not_ready',
        timestamp,
        checks: { database: 'error' },
        error: process.env.NODE_ENV === 'production' 
          ? 'Database connection failed' 
          : (error as Error).message,
      };

      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(response);
    }
  }
}


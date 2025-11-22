import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

interface HealthResponse {
  status: string;
  timestamp: string;
  env: string;
  uptime: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

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
}


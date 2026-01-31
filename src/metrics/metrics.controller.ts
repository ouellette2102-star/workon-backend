import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { RatioResponseDto } from './dto/ratio-response.dto';

@ApiTags('Metrics')
@Controller('api/v1/metrics')
export class MetricsController {
  private readonly startTime = Date.now();

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * GET /api/v1/metrics/prometheus
   */
  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description: 'Returns metrics in Prometheus exposition format',
  })
  @ApiProduces('text/plain')
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  async getPrometheusMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getPrometheusMetrics(this.startTime);
    res.send(metrics);
  }

  @Get('ratio')
  @ApiOperation({
    summary: 'Get worker to employer ratio',
    description:
      'Returns the ratio of workers to employers in a region or globally',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    example: 'Montréal',
    description: 'Region/city to filter by (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ratio metrics',
    type: RatioResponseDto,
  })
  async getRatio(@Query('region') region?: string): Promise<RatioResponseDto> {
    return this.metricsService.calculateRatio(region);
  }

  @Get('regions')
  @ApiOperation({
    summary: 'Get available regions',
    description: 'Returns list of regions/cities with active users',
  })
  @ApiResponse({
    status: 200,
    description: 'List of regions',
    schema: {
      example: ['Montréal', 'Laval', 'Québec', 'Gatineau'],
    },
  })
  async getRegions(): Promise<string[]> {
    return this.metricsService.getAvailableRegions();
  }
}


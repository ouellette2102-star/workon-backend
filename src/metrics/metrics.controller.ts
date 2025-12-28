import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { RatioResponseDto } from './dto/ratio-response.dto';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

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


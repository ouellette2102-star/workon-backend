import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { MissionsMapService } from './missions-map.service';
import { GetMissionsQueryDto } from './dto/get-missions.query.dto';
import {
  MissionPinDto,
  MissionDetailDto,
  MissionsHealthDto,
} from './dto/mission-pin.dto';

@ApiTags('Missions')
@ApiExtraModels(MissionPinDto, MissionDetailDto, MissionsHealthDto)
@Controller('api/v1/missions')
export class MissionsMapController {
  constructor(private readonly missionsMapService: MissionsMapService) {}

  /**
   * GET /api/v1/missions
   * Public endpoint - returns mission pins for map display
   */
  @Get()
  @ApiOperation({
    summary: 'List missions for map display',
    description:
      'Returns a lightweight list of missions optimized for map pin rendering. ' +
      'Use this endpoint to populate the map with mission markers. ' +
      'Each mission includes coordinates, category, price, and status. ' +
      'Supports geo-filtering by lat/lng/radius and filtering by status, category, city. ' +
      '**Public endpoint - no authentication required.**',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of mission pins for map display',
    type: [MissionPinDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters (e.g., lat without lng, invalid enum value)',
  })
  async getMissions(
    @Query() query: GetMissionsQueryDto,
  ): Promise<MissionPinDto[]> {
    return this.missionsMapService.getMissions(query);
  }

  /**
   * GET /api/v1/missions/health
   * Health endpoint for missions service
   */
  @Get('health')
  @ApiOperation({
    summary: 'Missions service health check',
    description:
      'Returns aggregated mission counts for monitoring and dashboards. ' +
      'Useful for verifying database connectivity and data availability. ' +
      '**Public endpoint - no authentication required.**',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status with mission counts',
    type: MissionsHealthDto,
  })
  async getHealth(): Promise<MissionsHealthDto> {
    return this.missionsMapService.getHealth();
  }

  /**
   * GET /api/v1/missions/:id
   * Public endpoint - returns mission details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get mission details by ID',
    description:
      'Returns complete mission information for the detail view. ' +
      'Includes all fields from the map pin plus description and address. ' +
      'Use this when user taps on a map pin to view full mission details. ' +
      '**Public endpoint - no authentication required.**',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique mission identifier (prefixed with lm_)',
    example: 'lm_123456789_abc',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Full mission details',
    type: MissionDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Mission not found with the provided ID',
  })
  async getMissionById(@Param('id') id: string): Promise<MissionDetailDto> {
    return this.missionsMapService.getMissionById(id);
  }
}


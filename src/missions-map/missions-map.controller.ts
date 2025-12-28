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

@ApiTags('missions-map')
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
    summary: 'Get missions for map (public)',
    description:
      'Returns lightweight mission data for map pins. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of missions',
    type: [MissionPinDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
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
    summary: 'Missions health check',
    description: 'Returns mission counts and service status',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status',
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
    summary: 'Get mission by ID (public)',
    description:
      'Returns full mission details for display. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mission ID',
    example: 'lm_123456789_abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission details',
    type: MissionDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getMissionById(@Param('id') id: string): Promise<MissionDetailDto> {
    return this.missionsMapService.getMissionById(id);
  }
}


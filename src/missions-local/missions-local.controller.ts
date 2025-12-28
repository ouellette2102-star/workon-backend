import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MissionsLocalService } from './missions-local.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { NearbyMissionsQueryDto } from './dto/nearby-missions-query.dto';
import { MissionsMapQueryDto } from './dto/missions-map-query.dto';
import { MissionsMapResponseDto } from './dto/mission-map-item.dto';
import { MissionResponseDto } from './dto/mission-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';

@ApiTags('Missions')
@Controller('missions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MissionsLocalController {
  constructor(private readonly missionsService: MissionsLocalService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new mission',
    description: 'Employers and residential clients can create missions',
  })
  @ApiResponse({
    status: 201,
    description: 'Mission created successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only employers and residential clients can create missions',
  })
  async create(
    @Body() createMissionDto: CreateMissionDto,
    @Request() req: any,
  ) {
    const mission = await this.missionsService.create(
      createMissionDto,
      req.user.sub,
      req.user.role,
    );

    return plainToInstance(MissionResponseDto, mission, {
      excludeExtraneousValues: true,
    });
  }

  @Get('map')
  @ApiOperation({
    summary: 'Get missions for map view',
    description:
      'Returns lightweight mission data for rendering map pins within a bounding box. ' +
      'More efficient than radius-based search for map rendering.',
  })
  @ApiQuery({ name: 'north', required: true, example: 45.55, description: 'Northern boundary latitude' })
  @ApiQuery({ name: 'south', required: true, example: 45.45, description: 'Southern boundary latitude' })
  @ApiQuery({ name: 'east', required: true, example: -73.5, description: 'Eastern boundary longitude' })
  @ApiQuery({ name: 'west', required: true, example: -73.7, description: 'Western boundary longitude' })
  @ApiQuery({ name: 'status', required: false, example: 'open', description: 'Filter by status (default: open)' })
  @ApiQuery({ name: 'category', required: false, example: 'plumbing', description: 'Filter by category' })
  @ApiQuery({ name: 'limit', required: false, example: 200, description: 'Max results (default: 200, max: 500)' })
  @ApiResponse({
    status: 200,
    description: 'List of missions within bounding box',
    type: MissionsMapResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid bounding box parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByMap(@Query() query: MissionsMapQueryDto): Promise<MissionsMapResponseDto> {
    return this.missionsService.findByBbox(query);
  }

  @Get('nearby')
  @ApiOperation({
    summary: 'Find nearby open missions',
    description: 'Workers can search for open missions near their location',
  })
  @ApiQuery({ name: 'latitude', required: true, example: 45.5017 })
  @ApiQuery({ name: 'longitude', required: true, example: -73.5673 })
  @ApiQuery({ name: 'radiusKm', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of nearby missions sorted by distance',
    type: [MissionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only workers can search for missions',
  })
  async findNearby(
    @Query() query: NearbyMissionsQueryDto,
    @Request() req: any,
  ) {
    const missions = await this.missionsService.findNearby(
      query,
      req.user.role,
    );

    return missions.map((mission) =>
      plainToInstance(MissionResponseDto, mission, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept a mission',
    description: 'Worker accepts an open mission',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission accepted successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only workers can accept missions' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 400, description: 'Mission not available' })
  async accept(@Param('id') id: string, @Request() req: any) {
    const mission = await this.missionsService.accept(
      id,
      req.user.sub,
      req.user.role,
    );

    return plainToInstance(MissionResponseDto, mission, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark mission as completed',
    description: 'Worker or mission creator marks mission as completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission completed successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only assigned worker or creator can complete',
  })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async complete(@Param('id') id: string, @Request() req: any) {
    const mission = await this.missionsService.complete(
      id,
      req.user.sub,
      req.user.role,
    );

    return plainToInstance(MissionResponseDto, mission, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a mission',
    description: 'Mission creator or admin cancels a mission',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission cancelled successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only creator or admin can cancel',
  })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    const mission = await this.missionsService.cancel(
      id,
      req.user.sub,
      req.user.role,
    );

    return plainToInstance(MissionResponseDto, mission, {
      excludeExtraneousValues: true,
    });
  }

  @Get('my-missions')
  @ApiOperation({
    summary: 'Get my created missions',
    description: 'Get missions created by the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of created missions',
    type: [MissionResponseDto],
  })
  async findMyMissions(@Request() req: any) {
    const missions = await this.missionsService.findMyMissions(req.user.sub);

    return missions.map((mission) =>
      plainToInstance(MissionResponseDto, mission, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get('my-assignments')
  @ApiOperation({
    summary: 'Get my assigned missions',
    description: 'Get missions assigned to the current worker',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assigned missions',
    type: [MissionResponseDto],
  })
  async findMyAssignments(@Request() req: any) {
    const missions = await this.missionsService.findMyAssignments(req.user.sub);

    return missions.map((mission) =>
      plainToInstance(MissionResponseDto, mission, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get mission by ID',
    description: 'Get detailed information about a specific mission',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission details',
    type: MissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async findOne(@Param('id') id: string) {
    const mission = await this.missionsService.findById(id);

    return plainToInstance(MissionResponseDto, mission, {
      excludeExtraneousValues: true,
    });
  }
}


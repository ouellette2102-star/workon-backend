import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  SkipThrottle,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsentGuard, RequireConsent } from '../compliance/guards/consent.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateMissionDto } from './dto/create-mission.dto';
import { ListAvailableMissionsDto } from './dto/list-available-missions.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { MissionFeedFiltersDto } from './dto/mission-feed.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Missions')
@Controller('api/v1/missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, ConsentGuard)
  @Roles(UserRole.EMPLOYER)
  @RequireConsent()
  createMission(@Request() req: any, @Body() dto: CreateMissionDto) {
    return this.missionsService.createMissionForEmployer(req.user.sub, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  listEmployerMissions(@Request() req: any) {
    return this.missionsService.getMissionsForEmployer(req.user.sub);
  }

  @Get('worker/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  listWorkerMissions(@Request() req: any) {
    return this.missionsService.getMissionsForWorker(req.user.sub);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  listAvailableMissions(
    @Request() req: any,
    @Query() filters: ListAvailableMissionsDto,
  ) {
    return this.missionsService.getAvailableMissionsForWorker(req.user.sub, filters);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  getMissionFeed(
    @Request() req: any,
    @Query() filters: MissionFeedFiltersDto,
  ) {
    return this.missionsService.getMissionFeed(req.user.sub, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getMissionById(@Request() req: any, @Param('id') missionId: string) {
    return this.missionsService.getMissionById(req.user.sub, missionId);
  }

  @Post(':id/reserve')
  @UseGuards(JwtAuthGuard, RolesGuard, ConsentGuard)
  @Roles(UserRole.WORKER)
  @RequireConsent()
  reserveMission(@Request() req: any, @Param('id') missionId: string) {
    return this.missionsService.reserveMission(req.user.sub, missionId);
  }

  /**
   * POST /api/v1/missions/webhook-ghl
   * Receives mission requests from GHL "Demande de Mission" form.
   * No authentication required — GHL POSTs here directly.
   */
  @Post('webhook-ghl')
  @SkipThrottle()
  async receiveGhlMission(@Body() body: any) {
    const mission = {
      clientName: body.full_name || `${body.first_name ?? ''} ${body.last_name ?? ''}`.trim() || 'Client GHL',
      clientEmail: body.email,
      clientPhone: body.phone,
      serviceType: body.service_type || body.type_de_service,
      description: body.description || body.message,
      city: body.city || body.ville,
      budget: body.budget ? Number(body.budget) : undefined,
      source: 'ghl_form',
    };

    const saved = await this.missionsService.createFromGhl(mission);
    return { success: true, missionId: saved.id };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  updateStatus(
    @Request() req: any,
    @Param('id') missionId: string,
    @Body() dto: UpdateMissionStatusDto,
  ) {
    return this.missionsService.updateMissionStatus(req.user.sub, missionId, dto);
  }
}
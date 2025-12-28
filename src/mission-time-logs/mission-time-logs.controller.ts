import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MissionTimeLogsService } from './mission-time-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Missions')
@Controller('api/v1/missions/:missionId/time-logs')
@UseGuards(JwtAuthGuard)
export class MissionTimeLogsController {
  constructor(
    private readonly missionTimeLogsService: MissionTimeLogsService,
  ) {}

  @Get()
  getTimeLogs(@Param('missionId') missionId: string, @Request() req: any) {
    return this.missionTimeLogsService.getLogsForMission(
      missionId,
      req.user.sub,
    );
  }

  @Post('check-in')
  checkIn(
    @Param('missionId') missionId: string,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.missionTimeLogsService.logCheckIn(
      missionId,
      req.user.sub,
      body.note,
    );
  }

  @Post('check-out')
  checkOut(
    @Param('missionId') missionId: string,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.missionTimeLogsService.logCheckOut(
      missionId,
      req.user.sub,
      body.note,
    );
  }
}


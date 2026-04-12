import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkerSkillsService } from './worker-skills.service';

class SetSkillsDto {
  skillIds: string[];
}

@ApiTags('Worker Skills')
@Controller('api/v1/workers/me/skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkerSkillsController {
  constructor(private readonly workerSkillsService: WorkerSkillsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get my skills',
    description:
      'Returns the authenticated worker\'s selected skills with full catalog details (name, category, permit info). ' +
      'Returns an empty array if no skills are set.',
  })
  @ApiOkResponse({
    description: 'Array of skill objects with category info',
  })
  async getMySkills(@Request() req: any) {
    return this.workerSkillsService.getMySkills(req.user.sub);
  }

  @Put()
  @ApiOperation({
    summary: 'Set my skills',
    description:
      'Replace the authenticated worker\'s skill list. ' +
      'Accepts an array of skill IDs from the catalog. ' +
      'All IDs are validated against the catalog — invalid IDs return 400. ' +
      'Duplicates are automatically removed. ' +
      'Pass an empty array to clear all skills.',
  })
  @ApiOkResponse({
    description: 'Updated array of skill objects with category info',
  })
  async setMySkills(
    @Body() dto: SetSkillsDto,
    @Request() req: any,
  ) {
    return this.workerSkillsService.setMySkills(req.user.sub, dto.skillIds);
  }
}

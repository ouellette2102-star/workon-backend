import {
  Controller,
  Post,
  Headers,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Scheduling Cron Controller
 *
 * Public endpoint (no JWT) for automated recurring mission generation.
 * Protected by CRON_SECRET header instead of JWT.
 * Designed to be called by Railway Cron or N8N workflows.
 */
@ApiTags('Scheduling Cron')
@Controller('api/v1/scheduling/cron')
@SkipThrottle()
export class SchedulingCronController {
  private readonly logger = new Logger(SchedulingCronController.name);

  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('generate-recurring')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate missions from all active recurring templates',
    description: 'Called by Railway Cron or N8N. Protected by x-cron-secret header.',
  })
  @ApiResponse({ status: 200, description: 'Generation results' })
  @ApiResponse({ status: 401, description: 'Invalid cron secret' })
  async generateRecurring(@Headers('x-cron-secret') cronSecret: string) {
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    this.logger.log('Cron: generating recurring missions...');
    return this.schedulingService.generateAllRecurring();
  }
}

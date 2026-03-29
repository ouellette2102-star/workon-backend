import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { GhlService } from './ghl.service';
import { GhlMissionWebhookDto } from './dto/ghl-mission-webhook.dto';
import { GhlWebhookGuard } from './guards/ghl-webhook.guard';

/**
 * GHL Integration Controller
 *
 * Mission webhook endpoint for GoHighLevel via N8N.
 * Protected by GHL_WEBHOOK_SECRET validation (x-ghl-secret header).
 *
 * Pro signup is handled by ProsController (src/pros/pros.controller.ts).
 */
@ApiTags('GHL Integration')
@UseGuards(GhlWebhookGuard)
@Controller('api/v1')
export class GhlController {
  private readonly logger = new Logger(GhlController.name);

  constructor(private readonly ghlService: GhlService) {}

  /**
   * Receive mission creation webhook from GHL via N8N
   * POST /api/v1/missions/webhook-ghl
   */
  @Post('missions/webhook-ghl')
  @HttpCode(200)
  @ApiOperation({
    summary: 'GHL Mission Webhook',
    description: 'Receives mission creation data from GoHighLevel via N8N workflow',
  })
  @ApiHeader({ name: 'x-ghl-secret', required: true, description: 'GHL webhook secret' })
  @ApiResponse({ status: 200, description: 'Mission created or duplicate detected' })
  @ApiResponse({ status: 401, description: 'Invalid or missing GHL webhook secret' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  async handleMissionWebhook(@Body() dto: GhlMissionWebhookDto) {
    this.logger.log(`Incoming GHL mission webhook: ${dto.title}`);
    return this.ghlService.createMissionFromGhl(dto);
  }
}

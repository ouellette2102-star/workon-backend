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
import { GhlProSignupDto } from './dto/ghl-pro-signup.dto';
import { GhlWebhookGuard } from './guards/ghl-webhook.guard';

/**
 * GHL Integration Controller
 *
 * Authenticated webhook endpoints for receiving data from
 * GoHighLevel via N8N automation workflows.
 *
 * Security: Protected by GhlWebhookGuard (API key or HMAC signature).
 * Rate limiting is handled by the global ThrottlerGuard.
 */
@ApiTags('GHL Integration')
@Controller('api/v1')
@UseGuards(GhlWebhookGuard)
export class GhlController {
  private readonly logger = new Logger(GhlController.name);

  constructor(private readonly ghlService: GhlService) {}

  /**
   * Receive mission creation webhook from GHL via N8N
   * POST /api/v1/missions/webhook-ghl
   *
   * No auth guard — called by N8N server-to-server
   */
  @Post('missions/webhook-ghl')
  @HttpCode(200)
  @ApiHeader({ name: 'X-Webhook-Secret', required: false, description: 'API key for webhook authentication' })
  @ApiOperation({
    summary: 'GHL Mission Webhook',
    description: 'Receives mission creation data from GoHighLevel via N8N workflow. Requires X-Webhook-Secret header.',
  })
  @ApiResponse({ status: 200, description: 'Mission created or duplicate detected' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  // Accept raw body — GHL/N8N payloads include extra fields (form_id,
  // contact_id, timestamp, etc.) that the global ValidationPipe with
  // forbidNonWhitelisted would reject. The service handles field mapping.
  async handleMissionWebhook(@Body() body: Record<string, any>) {
    // Map raw body to DTO shape — service normalizes snake_case/camelCase
    const dto = body as GhlMissionWebhookDto;
    this.logger.log(`Incoming GHL mission webhook: ${dto.title || dto.service_type || 'unknown'}`);
    return this.ghlService.createMissionFromGhl(dto);
  }

  /**
   * Receive worker signup webhook from GHL via N8N
   * POST /api/v1/pros/ghl-signup
   *
   * No auth guard — called by N8N server-to-server
   */
  @Post('pros/ghl-signup')
  @HttpCode(200)
  @ApiOperation({
    summary: 'GHL Pro Signup',
    description: 'Receives worker registration data from GoHighLevel signup form via N8N',
  })
  @ApiResponse({ status: 200, description: 'Worker registered or duplicate detected' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  async handleProSignup(@Body() dto: GhlProSignupDto) {
    this.logger.log(`Incoming GHL pro signup: ${dto.email}`);
    return this.ghlService.registerProFromGhl(dto);
  }
}

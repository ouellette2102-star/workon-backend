import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ProsService } from './pros.service';
import { GhlWebhookGuard } from '../ghl/guards/ghl-webhook.guard';

/**
 * Pros Controller — Endpoints publics pour l'onboarding des Pros
 * Reçoit les webhooks GHL (GoHighLevel) et N8N
 * Protected by GHL_WEBHOOK_SECRET validation (x-ghl-secret header).
 */
@ApiTags('Pros')
@UseGuards(GhlWebhookGuard)
@Controller('api/v1/pros')
export class ProsController {
  private readonly logger = new Logger(ProsController.name);

  constructor(private readonly prosService: ProsService) {}

  /**
   * POST /api/v1/pros/ghl-signup
   * Webhook reçu depuis GHL Forms quand un Pro s'inscrit
   * GHL → WorkOn Backend → Crée profil LocalUser → Trigger N8N
   */
  @Post('ghl-signup')
  @HttpCode(200)
  @ApiOperation({
    summary: 'GHL webhook: Pro signup form submission',
    description:
      'Receives webhook from GoHighLevel when a Pro completes the signup form. ' +
      'Creates or updates LocalUser profile, then triggers N8N pro-signup workflow.',
  })
  @ApiHeader({ name: 'x-ghl-secret', required: true, description: 'GHL webhook secret' })
  async handleGhlSignup(@Body() body: GhlWebhookPayload) {
    this.logger.log(`GHL signup received: ${body.email || body.contact?.email}`);

    const result = await this.prosService.handleGhlSignup(body);
    return { received: true, proId: result.id };
  }
}

interface GhlWebhookPayload {
  // GHL contact fields (standard format)
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  customFields?: Record<string, string>;
  tags?: string[];

  // GHL contact object (alternate format)
  contact?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    tags?: string[];
    customFields?: Record<string, string>;
  };
}

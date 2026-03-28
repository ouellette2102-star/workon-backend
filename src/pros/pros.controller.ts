import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProsService } from './pros.service';

/**
 * Pros Controller — Endpoints publics pour l'onboarding des Pros
 * Reçoit les webhooks GHL (GoHighLevel) et N8N
 */
@ApiTags('Pros')
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
  async handleGhlSignup(
    @Body() body: GhlWebhookPayload,
    @Headers('x-ghl-secret') ghlSecret?: string,
  ) {
    // Vérifier le secret GHL si configuré
    const expectedSecret = process.env.GHL_WEBHOOK_SECRET;
    if (expectedSecret && ghlSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid GHL webhook secret');
    }

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

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  HttpCode,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProsService } from './pros.service';
import { RegisterProDto } from './dto/register-pro.dto';

@ApiTags('Pros')
@Controller('api/v1/pros')
export class ProsController {
  private readonly logger = new Logger(ProsController.name);

  constructor(private readonly prosService: ProsService) {}

  /**
   * POST /api/v1/pros/register
   * Public — registers a professional from the landing page form.
   */
  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Register a professional',
    description:
      'Creates a professional profile from the onboarding form. ' +
      'Generates a unique slug for their public page, triggers GHL + N8N webhooks.',
  })
  @ApiResponse({ status: 201, description: 'Professional registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async registerPro(@Body() dto: RegisterProDto) {
    this.logger.log(`Pro registration: ${dto.email}`);
    return this.prosService.registerPro(dto);
  }

  /**
   * GET /api/v1/pros/:slug
   * Public — returns professional profile data for the dynamic page.
   */
  @Get(':slug')
  @ApiOperation({
    summary: 'Get professional profile by slug',
    description:
      'Returns the public profile of a professional by their URL slug. ' +
      'Used by the Next.js frontend to render /pro/{slug} pages.',
  })
  @ApiParam({ name: 'slug', example: 'marc-dubois-montreal' })
  @ApiResponse({ status: 200, description: 'Professional profile' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  async getProBySlug(@Param('slug') slug: string) {
    return this.prosService.getProBySlug(slug);
  }

  /**
   * POST /api/v1/pros/:id/media
   * Add a gallery image to a professional's profile.
   */
  @Post(':id/media')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add gallery image to professional profile' })
  @ApiParam({ name: 'id', description: 'Professional LocalUser ID' })
  @ApiResponse({ status: 201, description: 'Media added' })
  async addMedia(
    @Param('id') id: string,
    @Body() body: { imageUrl: string; caption?: string; type?: string },
  ) {
    return this.prosService.addProMedia(id, body.imageUrl, body.caption, body.type);
  }

  /**
   * POST /api/v1/pros/:id/demo-fields
   * Admin-only: set hourlyRate / jobTitle / gallery on a demo worker so
   * the home carousel shows a fully-rendered card. Reuses the existing
   * ADMIN_SECRET env (same as /admin/seed-catalog). Curl with
   * X-Admin-Secret header.
   *
   * Payload: { hourlyRate?, jobTitle?, galleryAppend? }
   * galleryAppend is merged into LocalUser.gallery (de-duplicated).
   */
  @Post(':id/demo-fields')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: seed demo fields on a worker (gated)' })
  async seedDemoFields(
    @Param('id') id: string,
    @Body()
    body: {
      hourlyRate?: number;
      jobTitle?: string;
      galleryAppend?: string[];
    },
    @Headers('x-admin-secret') adminSecret?: string,
  ) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || adminSecret !== expected) {
      throw new UnauthorizedException('Invalid admin secret');
    }
    return this.prosService.seedDemoFields(id, body);
  }

  /**
   * POST /api/v1/pros/ghl-signup
   * Webhook from GHL Forms when a Pro signs up.
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
    const expectedSecret = process.env.GHL_WEBHOOK_SECRET;
    if (!expectedSecret || ghlSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing GHL webhook secret');
    }

    this.logger.log(`GHL signup received: ${body.email || body.contact?.email}`);
    const result = await this.prosService.handleGhlSignup(body);
    return { received: true, proId: result.id };
  }
}

interface GhlWebhookPayload {
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  customFields?: Record<string, string>;
  tags?: string[];
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

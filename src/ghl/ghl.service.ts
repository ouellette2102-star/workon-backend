import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhlMissionWebhookDto } from './dto/ghl-mission-webhook.dto';
import { GhlProSignupDto } from './dto/ghl-pro-signup.dto';
import * as crypto from 'crypto';

/**
 * GHL Integration Service
 *
 * Handles webhook payloads from GoHighLevel via N8N.
 * Creates missions and worker accounts from GHL form submissions.
 */
@Injectable()
export class GhlService {
  private readonly logger = new Logger(GhlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a mission from GHL webhook (via N8N)
   *
   * Flow: GHL Form → N8N Workflow → POST /api/v1/missions/webhook-ghl
   */
  async createMissionFromGhl(dto: GhlMissionWebhookDto) {
    this.logger.log(`GHL mission webhook received: ${dto.title} (${dto.city})`);

    // Idempotency: check for duplicate by title + city within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await this.prisma.localMission.findFirst({
      where: {
        title: dto.title,
        city: dto.city,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (existing) {
      this.logger.warn(`Duplicate GHL mission detected: ${existing.id}`);
      return {
        duplicate: true,
        missionId: existing.id,
        message: 'Mission already created from this GHL submission',
      };
    }

    // Find or create a system user for GHL-originated missions
    // GHL contacts may not have a backend account yet
    const ghlSystemUserId = 'system_ghl_bot';
    const systemUser = await this.prisma.localUser.upsert({
      where: { id: ghlSystemUserId },
      create: {
        id: ghlSystemUserId,
        firstName: 'GHL',
        lastName: 'Bot',
        email: 'ghl-bot@workon.ca',
        hashedPassword: 'SYSTEM_ACCOUNT_NO_LOGIN',
        role: 'employer',
        active: true,
        updatedAt: new Date(),
      },
      update: {},
    });
    const createdByUserId = systemUser.id;

    const id = `lm_ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const mission = await this.prisma.localMission.create({
      data: {
        id,
        title: dto.title,
        description: `${dto.description}${dto.clientName ? ` — Client: ${dto.clientName}` : ''}${dto.clientEmail ? ` (${dto.clientEmail})` : ''}`,
        category: dto.category,
        price: dto.price,
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city,
        address: dto.address || null,
        createdByUserId,
        status: 'open',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`GHL mission created: ${mission.id}`);

    return {
      duplicate: false,
      missionId: mission.id,
      status: 'open',
      message: 'Mission created successfully from GHL',
    };
  }

  /**
   * Register a worker (pro) from GHL signup form (via N8N)
   *
   * Flow: GHL Form → N8N Workflow → POST /api/v1/pros/ghl-signup
   */
  async registerProFromGhl(dto: GhlProSignupDto) {
    this.logger.log(`GHL pro signup received: ${dto.email}`);

    // Idempotency: check if email already exists
    const existing = await this.prisma.localUser.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      this.logger.warn(`Pro already registered: ${existing.id} (${dto.email})`);
      return {
        duplicate: true,
        userId: existing.id,
        message: 'Worker already registered with this email',
      };
    }

    const id = `lu_ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate a temporary hashed password (user will set real password via onboarding)
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.localUser.create({
      data: {
        id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        hashedPassword,
        phone: dto.phone || null,
        city: dto.city || null,
        role: 'worker',
        active: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`GHL pro registered: ${user.id} (${dto.email})`);

    return {
      duplicate: false,
      userId: user.id,
      email: user.email,
      message: 'Worker registered successfully from GHL',
    };
  }
}

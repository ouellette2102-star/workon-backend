import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhlMissionWebhookDto } from './dto/ghl-mission-webhook.dto';

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

    // Atomic: upsert system user + create mission in a single transaction
    const mission = await this.prisma.$transaction(async (tx) => {
      const ghlSystemUserId = 'system_ghl_bot';
      const systemUser = await tx.localUser.upsert({
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

      const id = `lm_ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return tx.localMission.create({
        data: {
          id,
          title: dto.title,
          description: `${dto.description}${dto.clientName ? ` — Client: ${dto.clientName}` : ''}${dto.clientEmail ? ` (${dto.clientEmail})` : ''}`,
          category: dto.category,
          priceCents: dto.priceCents,
          latitude: dto.latitude,
          longitude: dto.longitude,
          city: dto.city,
          address: dto.address || null,
          createdByUserId: systemUser.id,
          status: 'open',
          updatedAt: new Date(),
        },
      });
    });

    this.logger.log(`GHL mission created: ${mission.id}`);

    return {
      duplicate: false,
      missionId: mission.id,
      status: 'open',
      message: 'Mission created successfully from GHL',
    };
  }

  // Pro signup consolidated into ProsService (src/pros/pros.service.ts)
}

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
   *
   * Accepts both camelCase (pre-mapped by N8N) and snake_case (raw GHL) fields.
   * Creates a real client LocalUser when email is provided, falls back to system bot.
   * Notifies N8N after mission creation (fire-and-forget).
   */
  async createMissionFromGhl(dto: GhlMissionWebhookDto) {
    // ── Step 1: Normalize fields (camelCase takes priority, snake_case fallback) ──
    const clientName = dto.clientName
      || dto.full_name
      || `${dto.first_name ?? ''} ${dto.last_name ?? ''}`.trim()
      || null;
    const clientEmail = (dto.clientEmail || dto.email || '').toLowerCase().trim() || null;
    const clientPhone = dto.phone || null;
    const resolvedTitle = dto.title || dto.service_type || dto.type_de_service || 'Service GHL';
    const resolvedDescription = dto.description || dto.message || '';
    const resolvedCategory = dto.category || dto.service_type || dto.type_de_service || 'general';
    const resolvedCity = dto.city || dto.ville || '';
    const resolvedPrice = dto.price ?? (dto.budget ? Number(dto.budget) : 0);
    const resolvedLatitude = dto.latitude ?? 0;
    const resolvedLongitude = dto.longitude ?? 0;

    this.logger.log(`GHL mission webhook received: ${resolvedTitle} (${resolvedCity})`);

    // ── Step 2: Idempotency — check for duplicate by title + city within last hour ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await this.prisma.localMission.findFirst({
      where: {
        title: resolvedTitle,
        city: resolvedCity,
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

    // ── Step 3: Resolve mission creator ──
    // If client email is provided, create or find a real LocalUser (employer).
    // Otherwise fall back to the system GHL bot account.
    let createdByUserId: string;

    if (clientEmail) {
      let clientUser = await this.prisma.localUser.findFirst({
        where: { email: clientEmail },
      });

      if (!clientUser) {
        const bcrypt = await import('bcryptjs');
        const tempPassword = await bcrypt.hash(
          `ghl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          10,
        );
        const [firstName, ...rest] = (clientName || 'Client GHL').split(' ');
        clientUser = await this.prisma.localUser.create({
          data: {
            id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            email: clientEmail,
            hashedPassword: tempPassword,
            firstName,
            lastName: rest.join(' ') || 'GHL',
            phone: clientPhone ?? '',
            city: resolvedCity,
            role: 'employer',
            updatedAt: new Date(),
          },
        });
        this.logger.log(`New GHL client created: ${clientUser.id} (${clientEmail})`);
      }

      createdByUserId = clientUser.id;
    } else {
      // Fallback: system bot for submissions without client email
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
      createdByUserId = systemUser.id;
    }

    // ── Step 4: Create LocalMission ──
    const id = `lm_ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const descriptionParts = [resolvedDescription];
    if (clientName) descriptionParts.push(`— Client: ${clientName}`);
    if (clientEmail) descriptionParts.push(`(${clientEmail})`);

    const mission = await this.prisma.localMission.create({
      data: {
        id,
        title: resolvedTitle,
        description: descriptionParts.join(' '),
        category: resolvedCategory,
        price: resolvedPrice,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        city: resolvedCity,
        address: dto.address || null,
        createdByUserId,
        status: 'open',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`GHL mission created: ${mission.id}`);

    // ── Step 5: Notify N8N (fire and forget) ──
    // Matches the payload shape from legacy MissionsService.createFromGhl()
    const n8nBase = process.env.N8N_WEBHOOK_BASE;
    if (n8nBase) {
      fetch(`${n8nBase}/webhook/mission-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: mission.id,
          clientName,
          clientEmail,
          clientPhone,
          serviceType: resolvedTitle,
          description: resolvedDescription,
          city: resolvedCity,
          budget: resolvedPrice,
          source: 'ghl_form',
        }),
      }).catch((e: Error) =>
        this.logger.warn(`N8N notification failed: ${e.message}`),
      );
    }

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

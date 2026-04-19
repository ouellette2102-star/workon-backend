import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalUserRole } from '@prisma/client';
import { RegisterProDto } from './dto/register-pro.dto';
import * as bcrypt from 'bcryptjs';

const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE;
const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL;

@Injectable()
export class ProsService {
  private readonly logger = new Logger(ProsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Public Registration ──────────────────────────────────

  /**
   * Register a professional from the landing page form.
   * Creates LocalUser, generates slug, triggers GHL + N8N.
   */
  async registerPro(dto: RegisterProDto) {
    const email = dto.email.toLowerCase().trim();

    // Check if email already exists
    const existing = await this.prisma.localUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec ce courriel');
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(dto.firstName, dto.lastName, dto.city);

    // Hash password (or create temp)
    const password = dto.password || `workon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Normalize phone
    const phone = dto.phone.replace(/\D/g, '');

    // Compute completion score
    const completionScore = this.computeCompletionScore({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone,
      city: dto.city,
      bio: dto.bio,
      category: dto.category,
    });

    // Create LocalUser
    const pro = await this.prisma.localUser.create({
      data: {
        id: `pro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email,
        hashedPassword,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone,
        city: dto.city.trim(),
        role: LocalUserRole.worker,
        slug,
        bio: dto.bio?.trim() || null,
        category: dto.category.trim().toLowerCase(),
        serviceRadiusKm: dto.serviceRadiusKm || 25,
        completionScore,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Pro registered: ${pro.id} (${email}) → /pro/${slug}`,
    );

    // Fire webhooks (non-blocking)
    this.fireGhlContactCreation(pro).catch((err) =>
      this.logger.warn(`GHL contact creation failed: ${err.message}`),
    );
    this.fireN8nProSignupWebhook(pro.id, email, completionScore, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone,
      city: dto.city,
    }).catch((err) =>
      this.logger.warn(`N8N pro-signup webhook failed: ${err.message}`),
    );

    return {
      id: pro.id,
      slug: pro.slug,
      email: pro.email,
      completionScore,
      profileUrl: `/pro/${slug}`,
    };
  }

  // ── Public Profile by Slug ────────────────────────────────

  /**
   * Get professional profile by slug for public page rendering.
   */
  async getProBySlug(slug: string) {
    const normalizedSlug = slug.toLowerCase().trim();

    const selectFields = {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      phone: true,
      email: true,
      pictureUrl: true,
      bio: true,
      category: true,
      serviceRadiusKm: true,
      completionScore: true,
      slug: true,
      trustTier: true,
      phoneVerified: true,
      createdAt: true,
      active: true,
      proMedia: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          url: true,
          caption: true,
          type: true,
        },
      },
    };

    // Try slug lookup first, then fallback to ID lookup
    let pro = await this.prisma.localUser.findUnique({
      where: { slug: normalizedSlug },
      select: selectFields,
    });

    if (!pro) {
      pro = await this.prisma.localUser.findUnique({
        where: { id: slug },
        select: selectFields,
      });
    }

    if (!pro || !pro.active) {
      throw new NotFoundException('Professionnel introuvable');
    }

    const leadCount = await this.prisma.lead.count({
      where: { userId: pro.id },
    });

    return {
      id: pro.id,
      firstName: pro.firstName,
      lastName: pro.lastName,
      fullName: `${pro.firstName} ${pro.lastName}`,
      city: pro.city,
      pictureUrl: pro.pictureUrl,
      bio: pro.bio,
      category: pro.category,
      serviceRadiusKm: pro.serviceRadiusKm,
      completionScore: pro.completionScore,
      slug: pro.slug,
      verified: pro.phoneVerified || pro.trustTier !== 'BASIC',
      memberSince: pro.createdAt,
      demandCount: leadCount,
      gallery: pro.proMedia,
    };
  }

  /**
   * Add a media item to a professional's gallery.
   */
  async addProMedia(proId: string, imageUrl: string, caption?: string, type = 'portfolio') {
    const pro = await this.prisma.localUser.findUnique({ where: { id: proId } });
    if (!pro) throw new NotFoundException('Professionnel introuvable');

    const maxSort = await this.prisma.proMedia.aggregate({
      where: { userId: proId },
      _max: { sortOrder: true },
    });

    return this.prisma.proMedia.create({
      data: {
        userId: proId,
        url: imageUrl,
        caption: caption || null,
        type,
        sortOrder: ((maxSort._max?.sortOrder) ?? -1) + 1,
      },
    });
  }

  /**
   * Admin-only: set hourlyRate / jobTitle, and append to LocalUser.gallery.
   * Used to seed demo showcase workers for the home carousel.
   * De-duplicates gallery entries.
   */
  async seedDemoFields(
    proId: string,
    body: { hourlyRate?: number; jobTitle?: string; galleryAppend?: string[] },
  ) {
    const pro = await this.prisma.localUser.findUnique({ where: { id: proId } });
    if (!pro) throw new NotFoundException('Professionnel introuvable');

    const nextGallery = Array.from(
      new Set([...(pro.gallery ?? []), ...(body.galleryAppend ?? [])]),
    );

    const updated = await this.prisma.localUser.update({
      where: { id: proId },
      data: {
        hourlyRate: body.hourlyRate ?? pro.hourlyRate,
        jobTitle: body.jobTitle ?? pro.jobTitle,
        gallery: nextGallery,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        jobTitle: true,
        gallery: true,
      },
    });

    return { ok: true, updated };
  }

  // ── GHL Webhook Signup (existing) ─────────────────────────

  async handleGhlSignup(payload: {
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
      customFields?: Record<string, string>;
    };
  }) {
    const contact = payload.contact ?? payload;
    const email = contact.email?.toLowerCase().trim();
    const firstName = contact.firstName || payload.first_name || '';
    const lastName = contact.lastName || payload.last_name || '';
    const phone = contact.phone || '';
    const city = contact.city || '';

    if (!email) {
      this.logger.warn('GHL signup received without email, skipping');
      return { id: null };
    }

    const filledFields = [firstName, lastName, phone, city].filter(Boolean).length;
    const completionScore = Math.round((filledFields / 4) * 100);

    let pro = await this.prisma.localUser.findUnique({ where: { email } });

    if (!pro) {
      const tempPassword = await bcrypt.hash(
        `ghl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        10,
      );

      const slug = await this.generateUniqueSlug(firstName, lastName, city);

      pro = await this.prisma.localUser.create({
        data: {
          id: `pro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email,
          hashedPassword: tempPassword,
          firstName,
          lastName,
          phone,
          city,
          role: LocalUserRole.worker,
          slug,
          completionScore,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`New Pro created from GHL: ${pro.id} (${email})`);
    } else {
      pro = await this.prisma.localUser.update({
        where: { email },
        data: {
          firstName: pro.firstName || firstName,
          lastName: pro.lastName || lastName,
          phone: pro.phone || phone,
          city: pro.city || city,
          slug: pro.slug || (await this.generateUniqueSlug(
            pro.firstName || firstName,
            pro.lastName || lastName,
            pro.city || city,
          )),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Existing Pro updated from GHL: ${pro.id} (${email})`);
    }

    this.fireN8nProSignupWebhook(pro.id, email, completionScore, {
      firstName,
      lastName,
      phone,
      city,
    }).catch((err) =>
      this.logger.warn(`N8N pro-signup webhook failed: ${err.message}`),
    );

    return { id: pro.id };
  }

  // ── Slug Generation ────────────────────────────────────────

  /**
   * Generate a URL-safe slug from name + city.
   * Handles Quebec accents (é→e, è→e, etc.) and deduplication.
   */
  async generateUniqueSlug(
    firstName: string,
    lastName: string,
    city: string,
  ): Promise<string> {
    const base = this.slugify(`${firstName}-${lastName}-${city}`);

    // Check if base slug is available
    const existing = await this.prisma.localUser.findUnique({
      where: { slug: base },
    });

    if (!existing) return base;

    // Append numeric suffix
    for (let i = 2; i <= 100; i++) {
      const candidate = `${base}-${i}`;
      const taken = await this.prisma.localUser.findUnique({
        where: { slug: candidate },
      });
      if (!taken) return candidate;
    }

    // Fallback: append random string
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents (é→e, è→e, ô→o, etc.)
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with -
      .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
      .replace(/-{2,}/g, '-'); // Collapse multiple dashes
  }

  // ── Completion Score ───────────────────────────────────────

  private computeCompletionScore(fields: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    bio?: string;
    category?: string;
  }): number {
    let score = 0;
    if (fields.firstName) score += 20;
    if (fields.lastName) score += 15;
    if (fields.phone) score += 20;
    if (fields.city) score += 15;
    if (fields.bio) score += 15;
    if (fields.category) score += 15;
    return Math.min(score, 100);
  }

  // ── Webhooks ───────────────────────────────────────────────

  private async fireGhlContactCreation(pro: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    city: string | null;
    category: string | null;
    slug: string | null;
  }): Promise<void> {
    if (!GHL_WEBHOOK_URL) return;

    await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_pro',
        contact: {
          id: pro.id,
          email: pro.email,
          firstName: pro.firstName,
          lastName: pro.lastName,
          phone: pro.phone,
          city: pro.city,
          category: pro.category,
          profileUrl: `/pro/${pro.slug}`,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    this.logger.log(`GHL contact created for pro ${pro.id}`);
  }

  private async fireN8nProSignupWebhook(
    proId: string,
    email: string,
    completionScore: number,
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
      city: string;
    },
  ): Promise<void> {
    if (!N8N_WEBHOOK_BASE) return;

    await fetch(`${N8N_WEBHOOK_BASE}/webhook/pro-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proId, email, completionScore, profile }),
    });
  }
}

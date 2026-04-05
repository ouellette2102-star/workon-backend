import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadStatus } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL;
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@workon.app';

if (SENDGRID_API_KEY && process.env.NODE_ENV !== 'test') {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a lead from the demand capture form.
   * Validates phone, checks for duplicates, stores lead,
   * then fires GHL webhook + notifications (non-blocking).
   */
  async createLead(dto: CreateLeadDto) {
    // 1. Normalize phone — strip all non-digits
    const normalizedPhone = dto.clientPhone.replace(/\D/g, '');
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      throw new BadRequestException('Numéro de téléphone canadien invalide');
    }

    // 2. Verify professional exists
    const pro = await this.prisma.localUser.findUnique({
      where: { id: dto.professionalId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        category: true,
      },
    });

    if (!pro) {
      throw new NotFoundException('Professionnel introuvable');
    }

    // 3. Duplicate detection — same phone + same pro within 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const duplicate = await this.prisma.lead.findFirst({
      where: {
        professionalId: dto.professionalId,
        clientPhone: normalizedPhone,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Une demande avec ce numéro a déjà été envoyée récemment à ce professionnel',
      );
    }

    // 4. Create lead
    const lead = await this.prisma.lead.create({
      data: {
        professionalId: dto.professionalId,
        clientName: dto.clientName.trim(),
        clientPhone: normalizedPhone,
        clientEmail: dto.clientEmail?.toLowerCase().trim() || null,
        serviceRequested: dto.serviceRequested.trim(),
        message: dto.message?.trim() || null,
        source: dto.source || 'organic',
        status: LeadStatus.NEW,
      },
    });

    this.logger.log(
      `Lead created: ${lead.id} → pro ${pro.id} (${pro.firstName} ${pro.lastName})`,
    );

    // 5. Auto-convert lead to mission (non-blocking)
    // Uses professional's city/location to create an open mission
    this.autoConvertLeadToMission(lead, pro).catch((err) =>
      this.logger.warn(`Lead→Mission auto-conversion failed: ${err.message}`),
    );

    // 6. Fire notifications (non-blocking)
    this.fireGhlWebhook(lead, pro).catch((err) =>
      this.logger.warn(`GHL webhook failed: ${err.message}`),
    );
    this.fireN8nLeadWebhook(lead, pro).catch((err) =>
      this.logger.warn(`N8N lead webhook failed: ${err.message}`),
    );
    this.sendProNotificationEmail(lead, pro).catch((err) =>
      this.logger.warn(`Pro notification email failed: ${err.message}`),
    );
    if (lead.clientEmail) {
      this.sendClientConfirmationEmail(lead, pro).catch((err) =>
        this.logger.warn(`Client confirmation email failed: ${err.message}`),
      );
    }

    return {
      id: lead.id,
      professionalName: `${pro.firstName} ${pro.lastName}`,
      status: lead.status,
      createdAt: lead.createdAt,
    };
  }

  /**
   * Get all leads (admin endpoint) with optional filters.
   */
  async getAllLeads(status?: LeadStatus, limit = 50, offset = 0) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          clientEmail: true,
          serviceRequested: true,
          message: true,
          status: true,
          source: true,
          createdAt: true,
          professionalId: true,
          professional: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total, limit, offset };
  }

  /**
   * Get all leads for a professional
   */
  async getLeadsByPro(proId: string, status?: LeadStatus) {
    const where: Record<string, unknown> = { professionalId: proId };
    if (status) where.status = status;

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        serviceRequested: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    return { leads, total: leads.length };
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, dto: UpdateLeadStatusDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Demande introuvable');

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: dto.status },
    });

    this.logger.log(`Lead ${leadId} status updated: ${lead.status} → ${dto.status}`);
    return updated;
  }

  // ── Lead → Mission Bridge ──────────────────────────────────

  /**
   * Quebec city coordinates for geo-defaulting.
   * Used when a professional's exact location isn't available.
   */
  private static readonly QC_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    'montréal': { lat: 45.5017, lng: -73.5673 },
    'montreal': { lat: 45.5017, lng: -73.5673 },
    'québec': { lat: 46.8139, lng: -71.2080 },
    'quebec': { lat: 46.8139, lng: -71.2080 },
    'laval': { lat: 45.6066, lng: -73.7124 },
    'gatineau': { lat: 45.4765, lng: -75.7013 },
    'longueuil': { lat: 45.5312, lng: -73.5185 },
    'sherbrooke': { lat: 45.4042, lng: -71.8929 },
    'trois-rivières': { lat: 46.3432, lng: -72.5432 },
    'trois-rivieres': { lat: 46.3432, lng: -72.5432 },
    'lévis': { lat: 46.8032, lng: -71.1827 },
    'levis': { lat: 46.8032, lng: -71.1827 },
    'terrebonne': { lat: 45.6960, lng: -73.6473 },
    'saint-jean-sur-richelieu': { lat: 45.3073, lng: -73.2628 },
    'repentigny': { lat: 45.7421, lng: -73.4596 },
    'brossard': { lat: 45.4583, lng: -73.4633 },
    'drummondville': { lat: 45.8838, lng: -72.4843 },
    'granby': { lat: 45.4001, lng: -72.7329 },
    'saint-hyacinthe': { lat: 45.6307, lng: -72.9570 },
    'rimouski': { lat: 48.4490, lng: -68.5240 },
    'saguenay': { lat: 48.4279, lng: -71.0548 },
  };

  /**
   * Automatically convert a lead into an open mission.
   * Maps serviceRequested → category, uses pro's city for geolocation.
   * The mission is created as "open" so nearby workers can see it.
   */
  private async autoConvertLeadToMission(
    lead: {
      id: string;
      clientName: string;
      clientPhone: string;
      clientEmail: string | null;
      serviceRequested: string;
      message: string | null;
    },
    pro: {
      id: string;
      firstName: string;
      lastName: string;
      city?: string | null;
      category?: string | null;
    },
  ): Promise<void> {
    // Check if this lead was already converted (graceful if leadId column not yet migrated)
    try {
      const existingMission = await this.prisma.localMission.findUnique({
        where: { leadId: lead.id },
      });
      if (existingMission) {
        this.logger.debug(`Lead ${lead.id} already converted to mission ${existingMission.id}`);
        return;
      }
    } catch {
      // leadId column may not exist yet — continue with creation
      this.logger.debug('leadId lookup failed (migration pending?), proceeding with creation');
    }

    // Resolve city from pro's profile
    const city = pro.city || 'Montréal';
    const normalizedCity = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const coords = LeadsService.QC_CITY_COORDS[normalizedCity]
      || LeadsService.QC_CITY_COORDS['montreal'];

    // Map serviceRequested to a category
    const category = this.mapServiceToCategory(lead.serviceRequested, pro.category);

    // Build mission title and description
    const title = `${lead.serviceRequested} — ${city}`;
    const description = [
      `Demande de ${lead.clientName} pour : ${lead.serviceRequested}.`,
      lead.message ? `\nDétails : ${lead.message}` : '',
      `\nCréée automatiquement à partir d'une demande client via WorkOn.`,
    ].filter(Boolean).join('');

    // Find or create system user for lead-originated missions
    const systemUserId = 'system_lead_bridge';
    await this.prisma.localUser.upsert({
      where: { id: systemUserId },
      create: {
        id: systemUserId,
        firstName: 'WorkOn',
        lastName: 'Demandes',
        email: 'leads@workon.ca',
        hashedPassword: 'SYSTEM_ACCOUNT_NO_LOGIN',
        role: 'employer',
        active: true,
        updatedAt: new Date(),
      },
      update: {},
    });

    // Create the mission (with graceful fallback if bridge columns not migrated yet)
    const missionId = `lm_lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let missionData: any = {
      id: missionId,
      title,
      description,
      category,
      price: 0, // Price TBD — pro will quote
      latitude: coords.lat,
      longitude: coords.lng,
      city,
      createdByUserId: systemUserId,
      status: 'open',
      updatedAt: new Date(),
    };

    // Try to include bridge fields (may fail if migration not yet applied)
    try {
      missionData = {
        ...missionData,
        leadId: lead.id,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        clientEmail: lead.clientEmail,
      };
      await this.prisma.localMission.create({ data: missionData });
    } catch (err) {
      // Fallback: create without bridge fields, append contact info to description
      this.logger.debug('Bridge fields failed, falling back to description-only');
      const fallbackDescription = `${description}\n\nContact: ${lead.clientName} — ${lead.clientPhone}${lead.clientEmail ? ` (${lead.clientEmail})` : ''}`;
      missionData = {
        id: missionId,
        title,
        description: fallbackDescription,
        category,
        price: 0,
        latitude: coords.lat,
        longitude: coords.lng,
        city,
        createdByUserId: systemUserId,
        status: 'open',
        updatedAt: new Date(),
      };
      await this.prisma.localMission.create({ data: missionData });
    }

    // Update lead status to QUALIFIED (mission created)
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.QUALIFIED },
    });

    this.logger.log(
      `Lead→Mission bridge: ${lead.id} → ${mission.id} (${category}, ${city})`,
    );
  }

  /**
   * Manually convert a lead to a mission with custom parameters.
   * Used by admin or pro to set price, exact location, etc.
   */
  async convertLeadToMission(
    leadId: string,
    params: {
      price?: number;
      latitude?: number;
      longitude?: number;
      city?: string;
      address?: string;
      category?: string;
      title?: string;
    } = {},
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        professional: {
          select: { id: true, firstName: true, lastName: true, city: true, category: true },
        },
      },
    });

    if (!lead) throw new NotFoundException('Demande introuvable');

    // Check if already converted
    const existingMission = await this.prisma.localMission.findUnique({
      where: { leadId },
    });
    if (existingMission) {
      throw new ConflictException('Cette demande a déjà été convertie en mission');
    }

    const city = params.city || lead.professional.city || 'Montréal';
    const normalizedCity = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const coords = params.latitude && params.longitude
      ? { lat: params.latitude, lng: params.longitude }
      : LeadsService.QC_CITY_COORDS[normalizedCity] || LeadsService.QC_CITY_COORDS['montreal'];

    const category = params.category || this.mapServiceToCategory(lead.serviceRequested, lead.professional.category);
    const title = params.title || `${lead.serviceRequested} — ${city}`;

    const systemUserId = 'system_lead_bridge';
    await this.prisma.localUser.upsert({
      where: { id: systemUserId },
      create: {
        id: systemUserId,
        firstName: 'WorkOn',
        lastName: 'Demandes',
        email: 'leads@workon.ca',
        hashedPassword: 'SYSTEM_ACCOUNT_NO_LOGIN',
        role: 'employer',
        active: true,
        updatedAt: new Date(),
      },
      update: {},
    });

    const missionId = `lm_lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const mission = await this.prisma.localMission.create({
      data: {
        id: missionId,
        title,
        description: [
          `Demande de ${lead.clientName} pour : ${lead.serviceRequested}.`,
          lead.message ? `\nDétails : ${lead.message}` : '',
        ].filter(Boolean).join(''),
        category,
        price: params.price ?? 0,
        latitude: coords.lat,
        longitude: coords.lng,
        city,
        address: params.address || null,
        createdByUserId: systemUserId,
        leadId: lead.id,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        clientEmail: lead.clientEmail,
        status: 'open',
        updatedAt: new Date(),
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.CONVERTED },
    });

    this.logger.log(`Manual lead→mission conversion: ${leadId} → ${missionId}`);

    return {
      missionId: mission.id,
      leadId: lead.id,
      title: mission.title,
      category: mission.category,
      city: mission.city,
      status: mission.status,
    };
  }

  /**
   * Map a free-form service description to a mission category.
   * Falls back to pro's category or 'other'.
   */
  private mapServiceToCategory(serviceRequested: string, proCategory?: string | null): string {
    const service = serviceRequested.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const categoryMap: Record<string, string[]> = {
      'entretien': ['entretien', 'menage', 'nettoyage', 'cleaning', 'lavage', 'femme de menage'],
      'reparation': ['reparation', 'repair', 'plomberie', 'plumbing', 'electricite', 'electrique'],
      'construction-legere': ['construction', 'renovation', 'peinture', 'painting', 'plancher', 'gyproc'],
      'commerce': ['commerce', 'vente', 'livraison', 'delivery', 'demenagement', 'moving'],
      'restauration': ['restauration', 'cuisine', 'traiteur', 'catering', 'chef'],
      'education': ['education', 'tutorat', 'tutoring', 'cours', 'formation'],
      'numerique': ['numerique', 'web', 'informatique', 'computer', 'site', 'digital'],
      'beaute': ['beaute', 'coiffure', 'esthetique', 'massage', 'maquillage'],
      'culture': ['culture', 'photo', 'video', 'musique', 'evenement', 'animation'],
      'services-a-la-personne': ['garde', 'babysitting', 'aide', 'accompagnement', 'soins'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((kw) => service.includes(kw))) {
        return category;
      }
    }

    // Fallback to pro's category or 'other'
    return proCategory || 'other';
  }

  // ── Webhooks (non-blocking) ──────────────────────────────

  private async fireGhlWebhook(
    lead: { id: string; clientName: string; clientPhone: string; clientEmail: string | null; serviceRequested: string; message: string | null },
    pro: { id: string; firstName: string; lastName: string; email: string; phone: string | null },
  ): Promise<void> {
    if (!GHL_WEBHOOK_URL) {
      this.logger.debug('GHL_WEBHOOK_URL not set, skipping webhook');
      return;
    }

    const payload = {
      type: 'new_lead',
      lead: {
        id: lead.id,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        clientEmail: lead.clientEmail,
        serviceRequested: lead.serviceRequested,
        message: lead.message,
      },
      professional: {
        id: pro.id,
        name: `${pro.firstName} ${pro.lastName}`,
        email: pro.email,
        phone: pro.phone,
      },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    this.logger.log(`GHL webhook sent for lead ${lead.id}: ${res.status}`);
  }

  private async fireN8nLeadWebhook(
    lead: { id: string; clientName: string; clientPhone: string; serviceRequested: string },
    pro: { id: string; firstName: string; lastName: string; email: string; phone: string | null },
  ): Promise<void> {
    if (!N8N_WEBHOOK_BASE) return;

    await fetch(`${N8N_WEBHOOK_BASE}/webhook/new-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        serviceRequested: lead.serviceRequested,
        proId: pro.id,
        proName: `${pro.firstName} ${pro.lastName}`,
        proEmail: pro.email,
        proPhone: pro.phone,
      }),
    });

    this.logger.log(`N8N lead webhook sent for lead ${lead.id}`);
  }

  // ── Email Notifications (SendGrid) ──────────────────────

  private async sendProNotificationEmail(
    lead: { id: string; clientName: string; clientPhone: string; serviceRequested: string; message: string | null },
    pro: { id: string; firstName: string; lastName: string; email: string },
  ): Promise<void> {
    if (!SENDGRID_API_KEY) {
      this.logger.debug('SENDGRID_API_KEY not set, skipping pro email');
      return;
    }

    await sgMail.send({
      to: pro.email,
      from: { email: SENDGRID_FROM_EMAIL, name: 'WorkOn' },
      subject: `Nouvelle demande : ${lead.clientName} cherche ${lead.serviceRequested}`,
      text: [
        `Bonjour ${pro.firstName},`,
        '',
        `Vous avez reçu une nouvelle demande via WorkOn.`,
        '',
        `Client : ${lead.clientName}`,
        `Téléphone : ${lead.clientPhone}`,
        `Service : ${lead.serviceRequested}`,
        lead.message ? `Message : ${lead.message}` : '',
        '',
        `Contactez ce client le plus rapidement possible pour maximiser vos chances.`,
        '',
        `— L'équipe WorkOn`,
      ].filter(Boolean).join('\n'),
      html: [
        `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">`,
        `<div style="background: #1A1A2E; color: white; padding: 24px; border-radius: 12px 12px 0 0;">`,
        `<h2 style="margin: 0; color: #FF4D1C;">Nouvelle demande</h2>`,
        `<p style="margin: 8px 0 0; opacity: 0.8;">via WorkOn</p>`,
        `</div>`,
        `<div style="background: white; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">`,
        `<p>Bonjour ${pro.firstName},</p>`,
        `<p>Vous avez reçu une nouvelle demande :</p>`,
        `<table style="width: 100%; border-collapse: collapse;">`,
        `<tr><td style="padding: 8px 0; color: #666;">Client</td><td style="padding: 8px 0; font-weight: 600;">${lead.clientName}</td></tr>`,
        `<tr><td style="padding: 8px 0; color: #666;">Téléphone</td><td style="padding: 8px 0; font-weight: 600;"><a href="tel:${lead.clientPhone}" style="color: #FF4D1C;">${lead.clientPhone}</a></td></tr>`,
        `<tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0; font-weight: 600;">${lead.serviceRequested}</td></tr>`,
        lead.message ? `<tr><td style="padding: 8px 0; color: #666;">Message</td><td style="padding: 8px 0;">${lead.message}</td></tr>` : '',
        `</table>`,
        `<p style="margin-top: 24px;"><a href="tel:${lead.clientPhone}" style="display: inline-block; background: #FF4D1C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Appeler le client</a></p>`,
        `</div></div>`,
      ].filter(Boolean).join(''),
    });

    this.logger.log(`Pro notification email sent to ${pro.email} for lead ${lead.id}`);
  }

  private async sendClientConfirmationEmail(
    lead: { id: string; clientName: string; clientEmail: string | null; serviceRequested: string },
    pro: { firstName: string; lastName: string },
  ): Promise<void> {
    if (!SENDGRID_API_KEY || !lead.clientEmail) return;

    await sgMail.send({
      to: lead.clientEmail,
      from: { email: SENDGRID_FROM_EMAIL, name: 'WorkOn' },
      subject: `Votre demande a été envoyée à ${pro.firstName} ${pro.lastName}`,
      text: [
        `Bonjour ${lead.clientName},`,
        '',
        `Votre demande pour "${lead.serviceRequested}" a bien été envoyée à ${pro.firstName} ${pro.lastName}.`,
        '',
        `Le professionnel vous contactera dans les prochaines heures.`,
        '',
        `— L'équipe WorkOn`,
      ].join('\n'),
      html: [
        `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">`,
        `<div style="background: #1A1A2E; color: white; padding: 24px; border-radius: 12px 12px 0 0;">`,
        `<h2 style="margin: 0; color: #FF4D1C;">Demande envoyée</h2>`,
        `</div>`,
        `<div style="background: white; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">`,
        `<p>Bonjour ${lead.clientName},</p>`,
        `<p>Votre demande pour <strong>${lead.serviceRequested}</strong> a bien été envoyée à <strong>${pro.firstName} ${pro.lastName}</strong>.</p>`,
        `<p>Le professionnel vous contactera dans les prochaines heures.</p>`,
        `<p style="color: #666; font-size: 14px; margin-top: 24px;">— L'équipe WorkOn</p>`,
        `</div></div>`,
      ].join(''),
    });

    this.logger.log(`Client confirmation email sent to ${lead.clientEmail} for lead ${lead.id}`);
  }
}

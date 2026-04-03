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

    // 5. Fire notifications (non-blocking)
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

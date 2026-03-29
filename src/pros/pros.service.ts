import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalUserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE;

@Injectable()
export class ProsService {
  private readonly logger = new Logger(ProsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reçoit le payload GHL et crée/met à jour le profil LocalUser du Pro
   * Puis trigger le workflow N8N pro-signup
   */
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
    // Normaliser les champs (GHL peut envoyer dans contact ou à la racine)
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

    // Calculer le completionScore
    const filledFields = [firstName, lastName, phone, city].filter(Boolean).length;
    const completionScore = Math.round((filledFields / 4) * 100);

    // Atomic: find-or-create pro in a single transaction
    const pro = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.localUser.findUnique({ where: { email } });

      if (!existing) {
        const tempPassword = await bcrypt.hash(
          `ghl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          10,
        );

        const created = await tx.localUser.create({
          data: {
            id: `pro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            email,
            hashedPassword: tempPassword,
            firstName,
            lastName,
            phone,
            city,
            role: LocalUserRole.worker,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`New Pro created from GHL: ${created.id} (${email})`);
        return created;
      }

      const updated = await tx.localUser.update({
        where: { email },
        data: {
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          phone: existing.phone || phone,
          city: existing.city || city,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Existing Pro updated from GHL: ${updated.id} (${email})`);
      return updated;
    });

    // Trigger N8N pro-signup workflow (non-bloquant, outside transaction)
    this.fireN8nProSignupWebhook(pro.id, email, completionScore, { firstName, lastName, phone, city }).catch(
      (err) => this.logger.warn(`N8N pro-signup webhook failed: ${err.message}`),
    );

    return { id: pro.id };
  }

  private async fireN8nProSignupWebhook(
    proId: string,
    email: string,
    completionScore: number,
    profile: { firstName: string; lastName: string; phone: string; city: string },
  ): Promise<void> {
    if (!N8N_WEBHOOK_BASE) return;

    await fetch(`${N8N_WEBHOOK_BASE}/webhook/pro-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proId, email, completionScore, profile }),
    });
  }
}

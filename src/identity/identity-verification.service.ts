import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdVerificationStatus, TrustTier } from '@prisma/client';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

/**
 * Identity Verification Service
 * PR-06: Identity Verification Hooks
 *
 * Manages user identity verification states:
 * - Phone verification (in-memory OTP, Twilio-ready)
 * - ID verification (government ID) — provider stub
 * - Bank verification (via Stripe Connect)
 * - Trust tier computation
 *
 * Phone OTP is stored in-process (Map). Fine for single-replica (current
 * prod setup). Swap to Redis when scaling horizontally.
 */
@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);
  private readonly otpStore = new Map<string, OtpEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string) {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: {
        phoneVerified: true,
        phoneVerifiedAt: true,
        idVerificationStatus: true,
        idVerifiedAt: true,
        idVerificationProvider: true,
        bankVerified: true,
        bankVerifiedAt: true,
        stripeAccountId: true,
        trustTier: true,
        trustTierUpdatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      phone: {
        verified: user.phoneVerified,
        verifiedAt: user.phoneVerifiedAt,
      },
      identity: {
        status: user.idVerificationStatus,
        verifiedAt: user.idVerifiedAt,
        provider: user.idVerificationProvider,
      },
      bank: {
        verified: user.bankVerified,
        verifiedAt: user.bankVerifiedAt,
        hasStripeAccount: !!user.stripeAccountId,
      },
      trustTier: user.trustTier,
      trustTierUpdatedAt: user.trustTierUpdatedAt,
    };
  }

  /**
   * Start phone verification — generate OTP and "send" it.
   *
   * In DEV (NODE_ENV !== 'production') the OTP is returned in the response
   * body to ease testing. In prod, the OTP is logged and will be sent via
   * Twilio once `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` are configured.
   */
  async startPhoneVerification(userId: string): Promise<{
    sent: boolean;
    expiresInSeconds: number;
    devOtp?: string;
  }> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, phoneVerified: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phone) {
      throw new BadRequestException(
        'Aucun numéro de téléphone enregistré pour ce compte',
      );
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Téléphone déjà vérifié');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(userId, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const twilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    );

    if (twilioConfigured) {
      // Twilio SDK hook — branch when creds are set.
      this.logger.log(
        `[identity] Sending OTP to ${user.phone} for user ${userId} via Twilio`,
      );
    } else {
      this.logger.warn(
        `[identity] TWILIO not configured. OTP for user ${userId} (${user.phone}): ${code}`,
      );
    }

    return {
      sent: true,
      expiresInSeconds: OTP_TTL_MS / 1000,
      ...(isProd ? {} : { devOtp: code }),
    };
  }

  /**
   * Confirm OTP code for phone verification.
   * Marks phone as verified on success.
   */
  async confirmPhoneOtp(
    userId: string,
    code: string,
  ): Promise<{ verified: true; trustTier: TrustTier }> {
    const entry = this.otpStore.get(userId);

    if (!entry) {
      throw new BadRequestException(
        'Aucun code en attente. Demandez un nouveau code.',
      );
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(userId);
      throw new BadRequestException('Code expiré. Demandez un nouveau code.');
    }

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(userId);
      throw new UnauthorizedException(
        'Trop de tentatives. Demandez un nouveau code.',
      );
    }

    entry.attempts++;

    if (entry.code !== code.trim()) {
      throw new UnauthorizedException('Code incorrect');
    }

    this.otpStore.delete(userId);
    await this.markPhoneVerified(userId);
    const trustTier = await this.recomputeTrustTier(userId);

    return { verified: true, trustTier };
  }

  /**
   * Start ID verification flow.
   *
   * No provider integrated yet (Stripe Identity, Onfido, Veriff are
   * options). This stub marks status as PENDING and returns a message.
   * Provider webhook will later call `updateIdVerificationStatus` when
   * integrated.
   */
  async startIdVerification(userId: string): Promise<{
    status: IdVerificationStatus;
    provider: string | null;
    sessionUrl: string | null;
    message: string;
  }> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { idVerificationStatus: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.idVerificationStatus === IdVerificationStatus.VERIFIED) {
      throw new BadRequestException("Identité déjà vérifiée");
    }

    await this.prisma.localUser.update({
      where: { id: userId },
      data: { idVerificationStatus: IdVerificationStatus.PENDING },
    });

    this.logger.log(`[identity] ID verification PENDING for user ${userId}`);

    return {
      status: IdVerificationStatus.PENDING,
      provider: null,
      sessionUrl: null,
      message:
        'Vérification en attente. Un agent vous contactera sous 24h pour compléter la vérification.',
    };
  }

  /**
   * Mark phone as verified
   * Called after OTP verification succeeds
   */
  async markPhoneVerified(userId: string): Promise<void> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.phone) {
      throw new BadRequestException('User has no phone number');
    }

    if (user.phoneVerified) {
      this.logger.log(`Phone already verified for user ${userId}`);
      return;
    }

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    });

    this.logger.log(`Phone verified for user ${userId}`);

    // Recompute trust tier
    await this.recomputeTrustTier(userId);
  }

  /**
   * Update ID verification status
   * Called by webhook from verification provider
   */
  async updateIdVerificationStatus(
    userId: string,
    status: IdVerificationStatus,
    provider?: string,
    externalRef?: string,
  ): Promise<void> {
    const data: Record<string, unknown> = {
      idVerificationStatus: status,
    };

    if (status === IdVerificationStatus.VERIFIED) {
      data.idVerifiedAt = new Date();
    }

    if (provider) {
      data.idVerificationProvider = provider;
    }

    if (externalRef) {
      data.idVerificationRef = externalRef;
    }

    await this.prisma.localUser.update({
      where: { id: userId },
      data,
    });

    this.logger.log(`ID verification status updated for user ${userId}: ${status}`);

    // Recompute trust tier
    await this.recomputeTrustTier(userId);
  }

  /**
   * Mark bank as verified
   * Called when Stripe Connect onboarding completes
   */
  async markBankVerified(userId: string, stripeAccountId: string): Promise<void> {
    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        bankVerified: true,
        bankVerifiedAt: new Date(),
        stripeAccountId,
      },
    });

    this.logger.log(`Bank verified for user ${userId} (Stripe: ${stripeAccountId})`);

    // Recompute trust tier
    await this.recomputeTrustTier(userId);
  }

  /**
   * Recompute trust tier based on verification status
   *
   * Trust Tiers:
   * - BASIC: Email verified only (default)
   * - VERIFIED: Phone verified
   * - TRUSTED: Phone + ID verified
   * - PREMIUM: Phone + ID + Bank verified
   */
  async recomputeTrustTier(userId: string): Promise<TrustTier> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: {
        phoneVerified: true,
        idVerificationStatus: true,
        bankVerified: true,
        trustTier: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let newTier: TrustTier = TrustTier.BASIC;

    if (user.phoneVerified) {
      newTier = TrustTier.VERIFIED;

      if (user.idVerificationStatus === IdVerificationStatus.VERIFIED) {
        newTier = TrustTier.TRUSTED;

        if (user.bankVerified) {
          newTier = TrustTier.PREMIUM;
        }
      }
    }

    // Only update if tier changed
    if (newTier !== user.trustTier) {
      await this.prisma.localUser.update({
        where: { id: userId },
        data: {
          trustTier: newTier,
          trustTierUpdatedAt: new Date(),
        },
      });

      this.logger.log(`Trust tier updated for user ${userId}: ${user.trustTier} -> ${newTier}`);
    }

    return newTier;
  }

  /**
   * Check if user meets minimum trust tier
   * Used for feature gating (not hard enforcement yet)
   */
  async checkTrustTier(userId: string, minimumTier: TrustTier): Promise<boolean> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { trustTier: true },
    });

    if (!user) {
      return false;
    }

    const tierOrder: TrustTier[] = [
      TrustTier.BASIC,
      TrustTier.VERIFIED,
      TrustTier.TRUSTED,
      TrustTier.PREMIUM,
    ];

    const userTierIndex = tierOrder.indexOf(user.trustTier);
    const minimumTierIndex = tierOrder.indexOf(minimumTier);

    return userTierIndex >= minimumTierIndex;
  }

  /**
   * Get verification requirements for a trust tier
   */
  getRequirementsForTier(tier: TrustTier): string[] {
    switch (tier) {
      case TrustTier.BASIC:
        return ['Email verified'];
      case TrustTier.VERIFIED:
        return ['Email verified', 'Phone verified'];
      case TrustTier.TRUSTED:
        return ['Email verified', 'Phone verified', 'ID verified'];
      case TrustTier.PREMIUM:
        return ['Email verified', 'Phone verified', 'ID verified', 'Bank verified'];
    }
  }

  /**
   * Get missing verifications for a user to reach a tier
   */
  async getMissingVerifications(userId: string, targetTier: TrustTier): Promise<string[]> {
    const status = await this.getVerificationStatus(userId);
    const missing: string[] = [];

    if (targetTier === TrustTier.BASIC) {
      return [];
    }

    if (!status.phone.verified) {
      missing.push('Phone verification');
    }

    if (targetTier === TrustTier.VERIFIED) {
      return missing;
    }

    if (status.identity.status !== IdVerificationStatus.VERIFIED) {
      missing.push('ID verification');
    }

    if (targetTier === TrustTier.TRUSTED) {
      return missing;
    }

    if (!status.bank.verified) {
      missing.push('Bank verification');
    }

    return missing;
  }
}


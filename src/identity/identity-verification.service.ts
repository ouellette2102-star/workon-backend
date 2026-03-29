import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdVerificationStatus, TrustTier } from '@prisma/client';

/**
 * Identity Verification Service
 * PR-06: Identity Verification Hooks
 *
 * Manages user identity verification states:
 * - Phone verification
 * - ID verification (government ID)
 * - Bank verification (via Stripe Connect)
 * - Trust tier computation
 *
 * NOTE: Actual verification providers (Twilio, Stripe Identity, etc.)
 * are NOT integrated yet. This service provides hooks and state management.
 * Hard enforcement is NOT enabled - this is for future trust tiers.
 */
@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

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

  /**
   * Create a Stripe Identity verification session
   * Returns the URL for the user to complete ID verification
   */
  async createStripeIdentitySession(userId: string): Promise<{ url: string; sessionId: string }> {
    const Stripe = require('stripe');
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new BadRequestException('Stripe is not configured');
    }

    const stripe = new Stripe(secretKey);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        workon_user_id: userId,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: `${frontendUrl}/verification/complete`,
    });

    // Update status to PENDING
    await this.updateIdVerificationStatus(userId, IdVerificationStatus.PENDING, 'stripe_identity', session.id);

    this.logger.log(`Stripe Identity session created for user ${userId}: ${session.id}`);

    return { url: session.url, sessionId: session.id };
  }

  /**
   * Handle Stripe Identity webhook (verification_session.verified / requires_input)
   */
  async handleStripeIdentityWebhook(sessionId: string, status: 'verified' | 'requires_input' | 'canceled'): Promise<void> {
    // Find user by verification ref
    const user = await this.prisma.localUser.findFirst({
      where: { idVerificationRef: sessionId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`No user found for identity session: ${sessionId}`);
      return;
    }

    const statusMap: Record<string, IdVerificationStatus> = {
      verified: IdVerificationStatus.VERIFIED,
      requires_input: IdVerificationStatus.FAILED,
      canceled: IdVerificationStatus.NOT_STARTED,
    };

    await this.updateIdVerificationStatus(user.id, statusMap[status] || IdVerificationStatus.FAILED, 'stripe_identity');
  }
}


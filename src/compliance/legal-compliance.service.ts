import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceDocumentType, ConsentType } from '@prisma/client';

/**
 * Legal Compliance Service
 * PR-07: Legal Compliance Baseline
 *
 * Manages:
 * - Terms & conditions versioning
 * - User consent tracking (GDPR/Loi 25)
 * - Data retention flags
 * - Data export requests (GDPR Art. 20)
 * - Deletion requests with grace period
 */
@Injectable()
export class LegalComplianceService {
  private readonly logger = new Logger(LegalComplianceService.name);

  // Grace period before permanent deletion (30 days)
  private readonly DELETION_GRACE_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // TERMS & CONDITIONS VERSIONING
  // ========================================

  /**
   * Get the current active terms version for a document type
   */
  async getCurrentTermsVersion(type: ComplianceDocumentType) {
    const terms = await this.prisma.termsVersion.findFirst({
      where: {
        type,
        isActive: true,
        effectiveAt: { lte: new Date() },
      },
      orderBy: { effectiveAt: 'desc' },
    });

    return terms;
  }

  /**
   * Create a new terms version (admin only)
   */
  async createTermsVersion(data: {
    type: ComplianceDocumentType;
    version: string;
    title: string;
    contentUrl: string;
    contentHash?: string;
    summary?: string;
    effectiveAt: Date;
    activateNow?: boolean;
  }) {
    // If activating now, deactivate all other versions of this type
    if (data.activateNow) {
      await this.prisma.termsVersion.updateMany({
        where: { type: data.type, isActive: true },
        data: { isActive: false },
      });
    }

    const terms = await this.prisma.termsVersion.create({
      data: {
        type: data.type,
        version: data.version,
        title: data.title,
        contentUrl: data.contentUrl,
        contentHash: data.contentHash,
        summary: data.summary,
        effectiveAt: data.effectiveAt,
        isActive: data.activateNow ?? false,
      },
    });

    this.logger.log(`Created terms version ${data.version} for ${data.type}`);
    return terms;
  }

  /**
   * Check if user has accepted current terms
   */
  async hasAcceptedCurrentTerms(userId: string, type: ComplianceDocumentType): Promise<boolean> {
    const currentTerms = await this.getCurrentTermsVersion(type);
    if (!currentTerms) {
      // No terms defined, consider accepted
      return true;
    }

    const acceptance = await this.prisma.complianceDocument.findFirst({
      where: {
        userId,
        type,
        version: currentTerms.version,
      },
    });

    return !!acceptance;
  }

  /**
   * Record user acceptance of terms
   */
  async recordTermsAcceptance(
    userId: string,
    type: ComplianceDocumentType,
    version: string,
    ipAddress?: string,
  ) {
    // Verify the version exists
    const terms = await this.prisma.termsVersion.findFirst({
      where: { type, version },
    });

    if (!terms) {
      throw new BadRequestException(`Terms version ${version} not found for ${type}`);
    }

    // Create or update acceptance record
    const existing = await this.prisma.complianceDocument.findFirst({
      where: { userId, type, version },
    });

    if (existing) {
      this.logger.log(`User ${userId} already accepted ${type} v${version}`);
      return existing;
    }

    const acceptance = await this.prisma.complianceDocument.create({
      data: {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        version,
        acceptedAt: new Date(),
      },
    });

    this.logger.log(`User ${userId} accepted ${type} v${version}`);
    return acceptance;
  }

  // ========================================
  // USER CONSENT MANAGEMENT
  // ========================================

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string) {
    const consents = await this.prisma.userConsent.findMany({
      where: { userId },
    });

    // Return as a map for easy lookup
    const consentMap: Record<ConsentType, { granted: boolean; grantedAt?: Date; revokedAt?: Date }> = {
      MARKETING_EMAIL: { granted: false },
      MARKETING_PUSH: { granted: false },
      ANALYTICS: { granted: false },
      THIRD_PARTY_SHARING: { granted: false },
      PERSONALIZATION: { granted: false },
    };

    for (const consent of consents) {
      consentMap[consent.consentType] = {
        granted: consent.granted,
        grantedAt: consent.grantedAt ?? undefined,
        revokedAt: consent.revokedAt ?? undefined,
      };
    }

    return consentMap;
  }

  /**
   * Update a specific consent
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    metadata?: { ipAddress?: string; userAgent?: string; source?: string },
  ) {
    const now = new Date();

    const consent = await this.prisma.userConsent.upsert({
      where: {
        userId_consentType: { userId, consentType },
      },
      create: {
        userId,
        consentType,
        granted,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        source: metadata?.source,
      },
      update: {
        granted,
        grantedAt: granted ? now : undefined,
        revokedAt: granted ? null : now,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    this.logger.log(`User ${userId} ${granted ? 'granted' : 'revoked'} consent: ${consentType}`);
    return consent;
  }

  /**
   * Update multiple consents at once
   */
  async updateConsents(
    userId: string,
    consents: Partial<Record<ConsentType, boolean>>,
    metadata?: { ipAddress?: string; userAgent?: string; source?: string },
  ) {
    const results: Record<string, unknown> = {};

    for (const [consentType, granted] of Object.entries(consents)) {
      if (granted !== undefined) {
        results[consentType] = await this.updateConsent(
          userId,
          consentType as ConsentType,
          granted,
          metadata,
        );
      }
    }

    return results;
  }

  // ========================================
  // DATA EXPORT (GDPR Art. 20)
  // ========================================

  /**
   * Request data export for a local user
   */
  async requestDataExport(userId: string): Promise<{ requestedAt: Date; estimatedCompletion: Date }> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if there's already a pending request
    if (user.dataExportRequestedAt && !user.dataExportCompletedAt) {
      const daysSinceRequest = Math.floor(
        (Date.now() - user.dataExportRequestedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceRequest < 30) {
        throw new BadRequestException(
          `Data export already requested on ${user.dataExportRequestedAt.toISOString()}. ` +
            `Please wait for completion or 30 days before requesting again.`,
        );
      }
    }

    const requestedAt = new Date();
    const estimatedCompletion = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        dataExportRequestedAt: requestedAt,
        dataExportCompletedAt: null,
      },
    });

    this.logger.log(`Data export requested for user ${userId}`);

    // NOTE: Actual export job should be triggered here (out of scope for PR-07)
    // The export would include: profile, missions, payments, messages, etc.

    return { requestedAt, estimatedCompletion };
  }

  /**
   * Mark data export as completed
   */
  async markDataExportCompleted(userId: string): Promise<void> {
    await this.prisma.localUser.update({
      where: { id: userId },
      data: { dataExportCompletedAt: new Date() },
    });

    this.logger.log(`Data export completed for user ${userId}`);
  }

  // ========================================
  // ACCOUNT DELETION (GDPR Art. 17)
  // ========================================

  /**
   * Request account deletion with grace period
   */
  async requestAccountDeletion(userId: string): Promise<{ scheduledFor: Date }> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletionRequestedAt) {
      throw new BadRequestException(
        `Deletion already requested on ${user.deletionRequestedAt.toISOString()}. ` +
          `Scheduled for ${user.deletionScheduledFor?.toISOString()}.`,
      );
    }

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + this.DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: now,
        deletionScheduledFor: scheduledFor,
      },
    });

    this.logger.log(`Deletion requested for user ${userId}, scheduled for ${scheduledFor.toISOString()}`);

    return { scheduledFor };
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(userId: string): Promise<void> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deletionRequestedAt) {
      throw new BadRequestException('No deletion request to cancel');
    }

    if (user.deletedAt) {
      throw new BadRequestException('Account already deleted');
    }

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      },
    });

    this.logger.log(`Deletion cancelled for user ${userId}`);
  }

  /**
   * Get users scheduled for deletion (for background job)
   */
  async getUsersScheduledForDeletion(): Promise<{ id: string; email: string; scheduledFor: Date }[]> {
    const users = await this.prisma.localUser.findMany({
      where: {
        deletionScheduledFor: { lte: new Date() },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        deletionScheduledFor: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      scheduledFor: u.deletionScheduledFor!,
    }));
  }

  // ========================================
  // TERMS ACCEPTANCE FOR LOCAL USERS
  // ========================================

  /**
   * Record terms acceptance for LocalUser
   */
  async recordLocalUserTermsAcceptance(
    userId: string,
    termsVersion: string,
    privacyVersion?: string,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: now,
        termsVersion,
        ...(privacyVersion && {
          privacyAcceptedAt: now,
          privacyVersion,
        }),
      },
    });

    this.logger.log(`LocalUser ${userId} accepted terms v${termsVersion}`);
  }

  /**
   * Update marketing consent for LocalUser
   */
  async updateLocalUserMarketingConsent(userId: string, consent: boolean): Promise<void> {
    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        marketingConsent: consent,
        marketingConsentAt: new Date(),
      },
    });

    this.logger.log(`LocalUser ${userId} ${consent ? 'granted' : 'revoked'} marketing consent`);
  }
}


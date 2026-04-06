import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Data Retention Service (GDPR / Loi 25 Québec)
 *
 * Manages data retention policies:
 * - Anonymizes deleted user data after grace period (30 days)
 * - Purges old audit logs (2 years)
 * - Removes expired sessions and OTPs
 * - Handles data export requests (GDPR Art. 20)
 *
 * Designed to be called via cron job.
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  // Retention periods
  private readonly DELETION_GRACE_DAYS = 30;
  private readonly AUDIT_LOG_RETENTION_DAYS = 730; // 2 years
  private readonly OTP_RETENTION_HOURS = 24;
  private readonly EXPIRED_SESSION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run all retention policies. Called by cron.
   */
  async runRetentionPolicies(): Promise<{
    anonymizedUsers: number;
    purgedAuditLogs: number;
    purgedOtps: number;
    purgedNotifications: number;
  }> {
    this.logger.log('Starting data retention policy run');

    const [anonymizedUsers, purgedAuditLogs, purgedOtps, purgedNotifications] =
      await Promise.all([
        this.anonymizeDeletedUsers(),
        this.purgeOldAuditLogs(),
        this.purgeExpiredOtps(),
        this.purgeOldNotifications(),
      ]);

    this.logger.log(
      `Retention complete: ${anonymizedUsers} users anonymized, ` +
        `${purgedAuditLogs} audit logs purged, ${purgedOtps} OTPs purged, ` +
        `${purgedNotifications} notifications purged`,
    );

    return { anonymizedUsers, purgedAuditLogs, purgedOtps, purgedNotifications };
  }

  /**
   * Anonymize users who requested deletion and grace period has passed.
   * Replaces PII with anonymous placeholders while keeping aggregate data.
   */
  private async anonymizeDeletedUsers(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    const usersToAnonymize = await this.prisma.localUser.findMany({
      where: {
        deletionScheduledFor: { lte: cutoff },
        deletedAt: null, // Not yet anonymized
      },
      select: { id: true, email: true },
    });

    for (const user of usersToAnonymize) {
      const anonId = `anon_${user.id.substring(0, 8)}`;

      await this.prisma.localUser.update({
        where: { id: user.id },
        data: {
          email: `${anonId}@deleted.workon.app`,
          firstName: 'Utilisateur',
          lastName: 'Supprimé',
          phone: null,
          pictureUrl: null,
          city: null,
          bio: null,
          slug: null,
          hashedPassword: 'ACCOUNT_DELETED',
          active: false,
          deletedAt: new Date(),
          // Clear verification data
          phoneVerified: false,
          idVerificationStatus: 'NOT_STARTED',
          idVerificationRef: null,
          bankVerified: false,
          stripeAccountId: null,
        },
      });

      this.logger.log(`Anonymized user ${user.id}`);
    }

    return usersToAnonymize.length;
  }

  /**
   * Purge audit logs older than retention period.
   */
  private async purgeOldAuditLogs(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.trustAuditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return result.count;
  }

  /**
   * Purge expired OTPs.
   */
  private async purgeExpiredOtps(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.OTP_RETENTION_HOURS * 60 * 60 * 1000,
    );

    const result = await this.prisma.emailOtp.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });

    return result.count;
  }

  /**
   * Purge read notifications older than 90 days.
   */
  private async purgeOldNotifications(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.EXPIRED_SESSION_DAYS * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.notification.deleteMany({
      where: {
        readAt: { not: null },
        createdAt: { lt: cutoff },
      },
    });

    return result.count;
  }

  /**
   * Export all user data (GDPR Art. 20 / Loi 25).
   * Returns a structured JSON of all personal data for a user.
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      include: {
        createdMissions: { select: { id: true, title: true, status: true, createdAt: true } },
        assignedMissions: { select: { id: true, title: true, status: true, createdAt: true } },
        offers: { select: { id: true, missionId: true, price: true, status: true, createdAt: true } },
        messages: { select: { id: true, content: true, createdAt: true } },
        devices: { select: { id: true, platform: true, createdAt: true } },
      },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    // Mark export as completed
    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        dataExportCompletedAt: new Date(),
      },
    });

    return {
      exportDate: new Date().toISOString(),
      personalInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        role: user.role,
        createdAt: user.createdAt,
      },
      verification: {
        phoneVerified: user.phoneVerified,
        idVerificationStatus: user.idVerificationStatus,
        bankVerified: user.bankVerified,
        trustTier: user.trustTier,
      },
      consent: {
        termsAcceptedAt: user.termsAcceptedAt,
        termsVersion: user.termsVersion,
        privacyAcceptedAt: user.privacyAcceptedAt,
        marketingConsent: user.marketingConsent,
      },
      missions: {
        created: user.createdMissions,
        assigned: user.assignedMissions,
      },
      offers: user.offers,
      messages: user.messages,
      devices: user.devices,
    };
  }

  /**
   * Request account deletion (starts grace period).
   */
  async requestDeletion(userId: string): Promise<{ scheduledFor: string }> {
    const scheduledFor = new Date(
      Date.now() + this.DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        deletionScheduledFor: scheduledFor,
      },
    });

    this.logger.log(`Deletion requested for user ${userId}, scheduled for ${scheduledFor.toISOString()}`);

    return { scheduledFor: scheduledFor.toISOString() };
  }

  /**
   * Cancel account deletion (within grace period).
   */
  async cancelDeletion(userId: string): Promise<void> {
    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      },
    });

    this.logger.log(`Deletion cancelled for user ${userId}`);
  }
}

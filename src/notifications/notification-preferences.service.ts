import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationPreference,
  NotificationType,
  DigestFrequency,
  Prisma,
} from '@prisma/client';

/**
 * Notification Preferences Service
 * PR-12: Notification Primitives
 *
 * Manages user notification preferences per type and channel.
 * Supports quiet hours, digest settings, and granular control.
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all notification preferences for a user
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { notificationType: 'asc' },
    });
  }

  /**
   * Get preference for a specific notification type
   */
  async getPreference(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: { userId, notificationType },
      },
    });
  }

  /**
   * Get or create default preference for a notification type
   */
  async getOrCreatePreference(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationPreference> {
    const existing = await this.getPreference(userId, notificationType);
    if (existing) return existing;

    // Create with defaults based on notification type
    const defaults = this.getDefaultsForType(notificationType);

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        notificationType,
        ...defaults,
      },
    });
  }

  /**
   * Update preference for a specific notification type
   */
  async updatePreference(
    userId: string,
    notificationType: NotificationType,
    data: {
      pushEnabled?: boolean;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      smsEnabled?: boolean;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      timezone?: string;
      digestEnabled?: boolean;
      digestFrequency?: DigestFrequency | null;
    },
  ): Promise<NotificationPreference> {
    // Validate quiet hours format
    if (data.quietHoursStart && !this.isValidTimeFormat(data.quietHoursStart)) {
      throw new BadRequestException('Invalid quietHoursStart format. Use HH:MM (24h)');
    }
    if (data.quietHoursEnd && !this.isValidTimeFormat(data.quietHoursEnd)) {
      throw new BadRequestException('Invalid quietHoursEnd format. Use HH:MM (24h)');
    }

    // Security notifications cannot be disabled
    if (notificationType === NotificationType.ACCOUNT_SECURITY) {
      data.pushEnabled = true;
      data.emailEnabled = true;
      data.inAppEnabled = true;
    }

    return this.prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: { userId, notificationType },
      },
      update: data,
      create: {
        userId,
        notificationType,
        ...this.getDefaultsForType(notificationType),
        ...data,
      },
    });
  }

  /**
   * Bulk update preferences for multiple notification types
   */
  async bulkUpdatePreferences(
    userId: string,
    updates: Array<{
      notificationType: NotificationType;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      smsEnabled?: boolean;
    }>,
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const update of updates) {
      const result = await this.updatePreference(userId, update.notificationType, update);
      results.push(result);
    }

    return results;
  }

  /**
   * Set quiet hours for all notification types
   */
  async setQuietHours(
    userId: string,
    quietHoursStart: string | null,
    quietHoursEnd: string | null,
    timezone?: string,
  ): Promise<void> {
    if (quietHoursStart && !this.isValidTimeFormat(quietHoursStart)) {
      throw new BadRequestException('Invalid quietHoursStart format. Use HH:MM (24h)');
    }
    if (quietHoursEnd && !this.isValidTimeFormat(quietHoursEnd)) {
      throw new BadRequestException('Invalid quietHoursEnd format. Use HH:MM (24h)');
    }

    await this.prisma.notificationPreference.updateMany({
      where: { userId },
      data: {
        quietHoursStart,
        quietHoursEnd,
        ...(timezone && { timezone }),
      },
    });

    this.logger.log(`Quiet hours set for user ${userId}: ${quietHoursStart} - ${quietHoursEnd}`);
  }

  /**
   * Check if notifications should be sent based on quiet hours
   */
  isInQuietHours(preference: NotificationPreference): boolean {
    if (!preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const timezone = preference.timezone || 'America/Toronto';

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    const currentTime = formatter.format(now);

    const start = preference.quietHoursStart;
    const end = preference.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Get enabled channels for a notification type
   */
  async getEnabledChannels(
    userId: string,
    notificationType: NotificationType,
  ): Promise<string[]> {
    const pref = await this.getOrCreatePreference(userId, notificationType);
    const channels: string[] = [];

    if (pref.pushEnabled) channels.push('push');
    if (pref.emailEnabled) channels.push('email');
    if (pref.inAppEnabled) channels.push('in_app');
    if (pref.smsEnabled) channels.push('sms');

    return channels;
  }

  /**
   * Check if a specific channel is enabled for a notification type
   */
  async isChannelEnabled(
    userId: string,
    notificationType: NotificationType,
    channel: 'push' | 'email' | 'in_app' | 'sms',
  ): Promise<boolean> {
    const pref = await this.getOrCreatePreference(userId, notificationType);

    switch (channel) {
      case 'push':
        return pref.pushEnabled;
      case 'email':
        return pref.emailEnabled;
      case 'in_app':
        return pref.inAppEnabled;
      case 'sms':
        return pref.smsEnabled;
      default:
        return false;
    }
  }

  /**
   * Disable all marketing notifications (for unsubscribe)
   */
  async unsubscribeFromMarketing(userId: string): Promise<void> {
    const marketingTypes = [
      NotificationType.MARKETING_PROMO,
      NotificationType.MARKETING_NEWS,
    ];

    for (const type of marketingTypes) {
      await this.updatePreference(userId, type, {
        pushEnabled: false,
        emailEnabled: false,
        smsEnabled: false,
      });
    }

    this.logger.log(`User ${userId} unsubscribed from marketing notifications`);
  }

  /**
   * Initialize default preferences for a new user
   */
  async initializeDefaultPreferences(userId: string): Promise<void> {
    const criticalTypes = [
      NotificationType.ACCOUNT_SECURITY,
      NotificationType.PAYMENT_RECEIVED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.MESSAGE_NEW,
      NotificationType.MISSION_NEW_OFFER,
      NotificationType.MISSION_OFFER_ACCEPTED,
    ];

    for (const type of criticalTypes) {
      await this.getOrCreatePreference(userId, type);
    }

    this.logger.log(`Default preferences initialized for user ${userId}`);
  }

  /**
   * Get default settings for a notification type
   */
  private getDefaultsForType(notificationType: NotificationType): Partial<NotificationPreference> {
    // Security notifications: always enabled
    if (notificationType === NotificationType.ACCOUNT_SECURITY) {
      return {
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        smsEnabled: false,
        digestEnabled: false,
      };
    }

    // Marketing notifications: opt-in only
    if (
      notificationType === NotificationType.MARKETING_PROMO ||
      notificationType === NotificationType.MARKETING_NEWS
    ) {
      return {
        pushEnabled: false,
        emailEnabled: false,
        inAppEnabled: false,
        smsEnabled: false,
        digestEnabled: false,
      };
    }

    // Payment notifications: important
    if (
      notificationType === NotificationType.PAYMENT_RECEIVED ||
      notificationType === NotificationType.PAYMENT_SENT ||
      notificationType === NotificationType.PAYMENT_FAILED ||
      notificationType === NotificationType.PAYOUT_PROCESSED
    ) {
      return {
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        smsEnabled: false,
        digestEnabled: false,
      };
    }

    // Default: push and in-app enabled
    return {
      pushEnabled: true,
      emailEnabled: false,
      inAppEnabled: true,
      smsEnabled: false,
      digestEnabled: false,
    };
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }
}


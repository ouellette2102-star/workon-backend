import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../push/push.service';
import {
  PushProvider,
  PushPayload,
  DeliveryResult,
} from './delivery-provider.interface';

/**
 * FCM Push Notification Provider
 * PR-A: Notification Delivery System
 *
 * Sends push notifications via Firebase Cloud Messaging.
 * Wraps the existing PushService for consistent interface.
 *
 * SAFETY:
 * - Validates tokens before sending
 * - Handles token invalidation gracefully
 * - Respects feature flag PUSH_NOTIFICATIONS_ENABLED
 */
@Injectable()
export class FcmPushProvider implements PushProvider {
  private readonly logger = new Logger(FcmPushProvider.name);

  readonly channel = 'push' as const;
  readonly providerName = 'fcm';

  constructor(private readonly pushService: PushService) {}

  /**
   * Check if FCM is ready
   */
  isReady(): boolean {
    return this.pushService.isReady;
  }

  /**
   * Send push notification via FCM
   */
  async send(payload: PushPayload): Promise<DeliveryResult> {
    if (!this.pushService.isReady) {
      return {
        success: false,
        errorCode: 'PROVIDER_NOT_READY',
        errorMessage: 'Firebase Admin is not initialized',
      };
    }

    if (!payload.tokens || payload.tokens.length === 0) {
      return {
        success: false,
        errorCode: 'NO_TOKENS',
        errorMessage: 'No push tokens provided',
      };
    }

    // Filter out invalid tokens
    const validTokens = payload.tokens.filter((token) => this.isValidToken(token));

    if (validTokens.length === 0) {
      return {
        success: false,
        errorCode: 'NO_VALID_TOKENS',
        errorMessage: 'All provided tokens are invalid',
      };
    }

    try {
      this.logger.debug(
        `Sending push to ${validTokens.length} device(s) [${payload.correlationId}]`,
      );

      // Use the existing PushService
      await this.pushService.sendNotification(
        validTokens,
        payload.title,
        payload.body,
        this.buildDataPayload(payload),
      );

      this.logger.log(
        `Push sent to ${validTokens.length} device(s) for user ${payload.userId}`,
      );

      return {
        success: true,
        metadata: {
          tokenCount: validTokens.length,
          skippedTokens: payload.tokens.length - validTokens.length,
        },
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown push error';

      this.logger.error(
        `Failed to send push for user ${payload.userId}: ${errorMessage}`,
        { correlationId: payload.correlationId },
      );

      return {
        success: false,
        errorCode: error.code || 'PUSH_FAILED',
        errorMessage: errorMessage.slice(0, 500),
      };
    }
  }

  /**
   * Validate token format (basic check)
   */
  private isValidToken(token: string): boolean {
    // FCM tokens are typically 100+ characters
    return typeof token === 'string' && token.length > 50 && !token.includes(' ');
  }

  /**
   * Build data payload for push notification
   */
  private buildDataPayload(payload: PushPayload): Record<string, string> {
    const data: Record<string, string> = {
      type: 'notification',
      userId: payload.userId,
      correlationId: payload.correlationId || '',
    };

    // Add custom data fields (stringify objects)
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        if (typeof value === 'string') {
          data[key] = value;
        } else {
          data[key] = JSON.stringify(value);
        }
      }
    }

    return data;
  }
}


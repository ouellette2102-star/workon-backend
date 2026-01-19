/**
 * Delivery Provider Interfaces
 * PR-A: Notification Delivery System
 *
 * Defines contracts for notification delivery across channels.
 * Each provider handles one channel type (email, push, sms).
 */

/**
 * Result of a delivery attempt
 */
export interface DeliveryResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Common payload for all notification types
 */
export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Email-specific payload
 */
export interface EmailPayload extends NotificationPayload {
  recipientEmail: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Push-specific payload
 */
export interface PushPayload extends NotificationPayload {
  tokens: string[];
  badge?: number;
  sound?: string;
  imageUrl?: string;
}

/**
 * SMS-specific payload (for future use)
 */
export interface SmsPayload extends NotificationPayload {
  phoneNumber: string;
}

/**
 * Base interface for all delivery providers
 */
export interface DeliveryProvider {
  /**
   * Provider channel type
   */
  readonly channel: 'email' | 'push' | 'sms' | 'in_app';

  /**
   * Provider name (for logging/tracking)
   */
  readonly providerName: string;

  /**
   * Check if provider is properly configured and ready
   */
  isReady(): boolean;

  /**
   * Send notification through this channel
   */
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}

/**
 * Email provider interface
 */
export interface EmailProvider extends DeliveryProvider {
  readonly channel: 'email';
  send(payload: EmailPayload): Promise<DeliveryResult>;
}

/**
 * Push notification provider interface
 */
export interface PushProvider extends DeliveryProvider {
  readonly channel: 'push';
  send(payload: PushPayload): Promise<DeliveryResult>;
}

/**
 * SMS provider interface (for future implementation)
 */
export interface SmsProvider extends DeliveryProvider {
  readonly channel: 'sms';
  send(payload: SmsPayload): Promise<DeliveryResult>;
}

/**
 * Delivery provider tokens for dependency injection
 */
export const DELIVERY_PROVIDERS = {
  EMAIL: 'EMAIL_DELIVERY_PROVIDER',
  PUSH: 'PUSH_DELIVERY_PROVIDER',
  SMS: 'SMS_DELIVERY_PROVIDER',
} as const;


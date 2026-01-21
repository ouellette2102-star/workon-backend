import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  EmailProvider,
  EmailPayload,
  DeliveryResult,
} from './delivery-provider.interface';

/**
 * SendGrid Email Provider
 * PR-A: Notification Delivery System
 *
 * Sends emails via SendGrid API.
 * Requires SENDGRID_API_KEY environment variable.
 *
 * SAFETY:
 * - Validates email format before sending
 * - Sanitizes content to prevent injection
 * - Respects feature flag EMAIL_NOTIFICATIONS_ENABLED
 */
@Injectable()
export class SendGridEmailProvider implements EmailProvider, OnModuleInit {
  private readonly logger = new Logger(SendGridEmailProvider.name);
  private initialized = false;
  private readonly fromEmail: string;
  private readonly fromName: string;

  readonly channel = 'email' as const;
  readonly providerName = 'sendgrid';

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@workon.app',
    );
    this.fromName = this.configService.get<string>(
      'SENDGRID_FROM_NAME',
      'WorkOn',
    );
  }

  onModuleInit(): void {
    this.initializeSendGrid();
  }

  /**
   * Initialize SendGrid with API key
   * 
   * SAFETY: Skips initialization in test environment to prevent
   * real network calls during CI/test runs.
   */
  private initializeSendGrid(): void {
    // Safety guard: Never initialize real SendGrid in tests
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'test') {
      this.logger.debug(
        'SendGrid initialization skipped: test environment detected. ' +
          'Use mock providers for testing.',
      );
      return;
    }

    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'SendGrid not initialized: SENDGRID_API_KEY not configured. ' +
          'Email notifications will be disabled.',
      );
      return;
    }

    try {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
      this.logger.log('SendGrid initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SendGrid', error);
    }
  }

  /**
   * Check if SendGrid is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Send email via SendGrid
   */
  async send(payload: EmailPayload): Promise<DeliveryResult> {
    if (!this.initialized) {
      return {
        success: false,
        errorCode: 'PROVIDER_NOT_READY',
        errorMessage: 'SendGrid is not initialized',
      };
    }

    // Validate email format
    if (!this.isValidEmail(payload.recipientEmail)) {
      return {
        success: false,
        errorCode: 'INVALID_EMAIL',
        errorMessage: `Invalid email format: ${payload.recipientEmail}`,
      };
    }

    try {
      const msg: sgMail.MailDataRequired = {
        to: payload.recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: this.sanitizeText(payload.title),
        text: this.sanitizeText(payload.body),
        html: this.formatHtmlBody(payload.title, payload.body),
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
        },
      };

      // Add reply-to if specified
      if (payload.replyTo) {
        msg.replyTo = payload.replyTo;
      }

      // Add custom headers for tracking
      msg.headers = {
        'X-WorkOn-Correlation-Id': payload.correlationId || 'none',
        'X-WorkOn-User-Id': payload.userId,
      };

      // Use template if specified
      if (payload.templateId) {
        msg.templateId = payload.templateId;
        msg.dynamicTemplateData = payload.templateData;
      }

      this.logger.debug(
        `Sending email to ${payload.recipientEmail} [${payload.correlationId}]`,
      );

      const response = await sgMail.send(msg);
      const messageId = response[0]?.headers?.['x-message-id'];

      this.logger.log(
        `Email sent to ${payload.recipientEmail} [messageId: ${messageId}]`,
      );

      return {
        success: true,
        providerMessageId: messageId,
        metadata: {
          statusCode: response[0]?.statusCode,
        },
      };
    } catch (error: any) {
      // Extract SendGrid error details
      const errorCode = error.code || 'SEND_FAILED';
      const errorMessage = error.response?.body?.errors?.[0]?.message 
        || error.message 
        || 'Unknown error';

      this.logger.error(
        `Failed to send email to ${payload.recipientEmail}: ${errorMessage}`,
        { code: errorCode, correlationId: payload.correlationId },
      );

      return {
        success: false,
        errorCode,
        errorMessage: this.sanitizeErrorMessage(errorMessage),
      };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize text to prevent injection
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .slice(0, 10000); // Max length
  }

  /**
   * Format HTML body for email
   */
  private formatHtmlBody(title: string, body: string): string {
    const safeTitle = this.sanitizeText(title);
    const safeBody = this.sanitizeText(body).replace(/\n/g, '<br>');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">WorkOn</h1>
  </div>
  <div class="content">
    <h2 style="margin-top: 0;">${safeTitle}</h2>
    <p>${safeBody}</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} WorkOn. Tous droits réservés.</p>
    <p>Vous recevez cet email car vous êtes inscrit sur WorkOn.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Sanitize error message for logging (remove PII)
   */
  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .slice(0, 500);
  }
}


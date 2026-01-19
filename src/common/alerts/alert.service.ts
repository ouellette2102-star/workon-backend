import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Alert Severity Levels
 * - critical: Immediate attention required (payment failures, security breaches)
 * - high: Important issues (service degradation, API errors)
 * - medium: Warnings (rate limiting, unusual activity)
 * - low: Informational (new deployments, config changes)
 */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertPayload {
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AlertService - Production alerting via webhooks
 * PR-01: Observability
 *
 * Sends critical alerts to Slack/Discord/custom webhooks.
 * Configure via ALERT_WEBHOOK_URL environment variable.
 *
 * Usage:
 *   this.alertService.sendAlert({
 *     severity: 'critical',
 *     title: 'Payment Failed',
 *     message: 'Stripe webhook processing failed',
 *     source: 'PaymentsService',
 *     correlationId: req.correlationId,
 *   });
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly webhookUrl: string | undefined;
  private readonly environment: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.enabled = this.configService.get<string>('ALERTS_ENABLED', '1') !== '0';

    if (this.enabled && !this.webhookUrl && this.environment === 'production') {
      this.logger.warn('ALERT_WEBHOOK_URL not configured - alerts will only be logged');
    }
  }

  /**
   * Send an alert to configured webhook
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    const timestamp = new Date().toISOString();

    // Always log the alert
    const logEntry = {
      type: 'ALERT',
      ...payload,
      timestamp,
      environment: this.environment,
    };

    const logMethod = this.getLogMethodForSeverity(payload.severity);
    this.logger[logMethod](JSON.stringify(logEntry));

    // Skip webhook in development unless explicitly enabled
    if (!this.enabled) {
      return;
    }

    // Skip if no webhook URL configured
    if (!this.webhookUrl) {
      return;
    }

    // Only send critical/high alerts in production
    if (this.environment !== 'production' && !['critical', 'high'].includes(payload.severity)) {
      return;
    }

    try {
      await this.sendToWebhook(payload, timestamp);
    } catch (error) {
      // Don't throw - alerting failures should not break the application
      this.logger.error(`Failed to send alert webhook: ${(error as Error).message}`);
    }
  }

  /**
   * Convenience method for critical alerts
   */
  async critical(title: string, message: string, source: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.sendAlert({ severity: 'critical', title, message, source, metadata });
  }

  /**
   * Convenience method for high severity alerts
   */
  async high(title: string, message: string, source: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.sendAlert({ severity: 'high', title, message, source, metadata });
  }

  /**
   * Send to webhook URL (supports Slack/Discord format auto-detection)
   */
  private async sendToWebhook(payload: AlertPayload, timestamp: string): Promise<void> {
    const webhookUrl = this.webhookUrl!;
    
    // Detect webhook type and format accordingly
    const body = this.formatWebhookBody(payload, timestamp, webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Format webhook body based on URL (Slack, Discord, or generic)
   */
  private formatWebhookBody(
    payload: AlertPayload,
    timestamp: string,
    webhookUrl: string,
  ): Record<string, unknown> {
    const severityEmoji = this.getSeverityEmoji(payload.severity);
    const title = `${severityEmoji} [${this.environment.toUpperCase()}] ${payload.title}`;

    // Slack format
    if (webhookUrl.includes('slack.com')) {
      return {
        text: title,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: title, emoji: true },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: payload.message },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `*Source:* ${payload.source}` },
              { type: 'mrkdwn', text: `*Time:* ${timestamp}` },
              ...(payload.correlationId
                ? [{ type: 'mrkdwn', text: `*Correlation ID:* ${payload.correlationId}` }]
                : []),
            ],
          },
        ],
      };
    }

    // Discord format
    if (webhookUrl.includes('discord.com')) {
      return {
        embeds: [
          {
            title,
            description: payload.message,
            color: this.getSeverityColor(payload.severity),
            fields: [
              { name: 'Source', value: payload.source, inline: true },
              { name: 'Environment', value: this.environment, inline: true },
              ...(payload.correlationId
                ? [{ name: 'Correlation ID', value: payload.correlationId, inline: true }]
                : []),
            ],
            timestamp,
          },
        ],
      };
    }

    // Generic webhook format
    return {
      title,
      message: payload.message,
      severity: payload.severity,
      source: payload.source,
      environment: this.environment,
      correlationId: payload.correlationId,
      metadata: payload.metadata,
      timestamp,
    };
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '📢';
      case 'low':
        return 'ℹ️';
    }
  }

  private getSeverityColor(severity: AlertSeverity): number {
    switch (severity) {
      case 'critical':
        return 0xff0000; // Red
      case 'high':
        return 0xff8c00; // Orange
      case 'medium':
        return 0xffcc00; // Yellow
      case 'low':
        return 0x00ccff; // Blue
    }
  }

  private getLogMethodForSeverity(severity: AlertSeverity): 'error' | 'warn' | 'log' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'log';
    }
  }
}


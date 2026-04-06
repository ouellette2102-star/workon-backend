import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Guard for GHL webhook endpoints.
 *
 * Validates requests using one of:
 * 1. API key in X-Webhook-Secret header (primary)
 * 2. HMAC signature in X-Webhook-Signature header (if GHL_WEBHOOK_SIGNING_SECRET set)
 *
 * Also provides replay protection via X-Webhook-Timestamp.
 */
@Injectable()
export class GhlWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GhlWebhookGuard.name);
  private readonly webhookSecret: string | undefined;
  private readonly signingSecret: string | undefined;
  private readonly maxAgeMs = 5 * 60 * 1000; // 5 minutes replay window

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('GHL_WEBHOOK_SECRET');
    this.signingSecret = this.configService.get<string>('GHL_WEBHOOK_SIGNING_SECRET');

    if (!this.webhookSecret && !this.signingSecret) {
      this.logger.warn(
        'GHL_WEBHOOK_SECRET and GHL_WEBHOOK_SIGNING_SECRET not configured. ' +
        'GHL webhooks will be REJECTED in production. Set at least one in environment.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const isProd = process.env.NODE_ENV === 'production';

    // In development, allow unauthenticated if no secret configured
    if (!this.webhookSecret && !this.signingSecret) {
      if (isProd) {
        this.logger.error('GHL webhook rejected: no secret configured in production');
        throw new UnauthorizedException('Webhook authentication not configured');
      }
      this.logger.warn('GHL webhook accepted without auth (development mode)');
      return true;
    }

    // Method 1: API key validation
    const providedSecret = request.headers['x-webhook-secret'] as string;
    if (this.webhookSecret && providedSecret) {
      if (crypto.timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(this.webhookSecret),
      )) {
        return true;
      }
      this.logger.warn(`GHL webhook rejected: invalid API key from ${request.ip}`);
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Method 2: HMAC signature validation
    const signature = request.headers['x-webhook-signature'] as string;
    if (this.signingSecret && signature) {
      const timestamp = request.headers['x-webhook-timestamp'] as string;

      // Replay protection
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (isNaN(age) || age > this.maxAgeMs || age < -this.maxAgeMs) {
          this.logger.warn(`GHL webhook rejected: timestamp too old/future from ${request.ip}`);
          throw new UnauthorizedException('Webhook timestamp expired');
        }
      }

      const body = JSON.stringify(request.body);
      const payload = timestamp ? `${timestamp}.${body}` : body;
      const expectedSignature = crypto
        .createHmac('sha256', this.signingSecret)
        .update(payload)
        .digest('hex');

      if (crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )) {
        return true;
      }
      this.logger.warn(`GHL webhook rejected: invalid HMAC signature from ${request.ip}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // No valid authentication provided
    this.logger.warn(`GHL webhook rejected: no authentication header from ${request.ip}`);
    throw new UnauthorizedException(
      'Missing webhook authentication. Provide X-Webhook-Secret or X-Webhook-Signature header.',
    );
  }
}

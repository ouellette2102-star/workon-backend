import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to validate GHL webhook secret (x-ghl-secret header).
 *
 * If GHL_WEBHOOK_SECRET is configured, the request must include
 * a matching x-ghl-secret header. If the env var is not set,
 * the guard passes (allows gradual rollout).
 */
@Injectable()
export class GhlWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GhlWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expectedSecret = this.configService.get<string>('GHL_WEBHOOK_SECRET');

    // If no secret configured, allow (dev/staging flexibility)
    if (!expectedSecret) {
      return true;
    }

    const providedSecret = request.headers['x-ghl-secret'];

    if (!providedSecret || providedSecret !== expectedSecret) {
      this.logger.warn(
        `Rejected GHL webhook — invalid or missing x-ghl-secret from ${request.ip}`,
      );
      throw new UnauthorizedException('Invalid GHL webhook secret');
    }

    return true;
  }
}

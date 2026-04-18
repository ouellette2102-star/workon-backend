import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

const FREE_MISSIONS_PER_MONTH = 3;

/**
 * Blocks POST /missions-local when a free-plan user exceeds the
 * monthly quota. Paid plans pass through unrestricted.
 *
 * Apply with `@UseGuards(JwtAuthGuard, MissionQuotaGuard)`.
 */
@Injectable()
export class MissionQuotaGuard implements CanActivate {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ user?: { sub?: string } }>();
    const userId = req.user?.sub;
    if (!userId) {
      // Let JwtAuthGuard handle missing auth
      return true;
    }

    const paid = await this.subscriptions.hasActiveSubscription(userId);
    if (paid) return true;

    const count = await this.subscriptions.missionsThisMonth(userId);
    if (count >= FREE_MISSIONS_PER_MONTH) {
      throw new ForbiddenException({
        code: 'QUOTA_EXCEEDED',
        limit: FREE_MISSIONS_PER_MONTH,
        used: count,
        message:
          `Limite gratuite de ${FREE_MISSIONS_PER_MONTH} missions par mois atteinte. ` +
          `Passez au plan Pro pour publier en illimité.`,
      });
    }
    return true;
  }
}

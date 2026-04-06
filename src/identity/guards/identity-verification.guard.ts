import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that requires identity verification before allowing
 * workers to accept missions or create offers.
 *
 * Workers must have idVerificationStatus = 'VERIFIED' to participate.
 * Employers/residential clients can proceed without verification.
 */
@Injectable()
export class IdentityVerificationGuard implements CanActivate {
  private readonly logger = new Logger(IdentityVerificationGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      return true; // Let auth guard handle this
    }

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: {
        role: true,
        idVerificationStatus: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      return true; // Let other guards handle user not found
    }

    // Only require verification for workers
    if (user.role !== 'worker') {
      return true;
    }

    // Workers must have verified identity
    if (user.idVerificationStatus !== 'VERIFIED') {
      this.logger.warn(
        `Worker ${userId} blocked: identity verification status is ${user.idVerificationStatus}`,
      );
      throw new ForbiddenException(
        'Identity verification required before accepting missions. ' +
        'Please complete your identity verification in your profile settings.',
      );
    }

    return true;
  }
}

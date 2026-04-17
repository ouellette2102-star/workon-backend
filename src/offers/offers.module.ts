import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IdentityVerificationGuard } from '../identity/guards/identity-verification.guard';

/**
 * Offers Module
 *
 * PROTECTION LÉGALE: Importe ComplianceModule pour activer ConsentGuard.
 * IDENTITY: Workers must verify identity before creating offers.
 */
@Module({
  imports: [PrismaModule, AuthModule, ComplianceModule, NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService, IdentityVerificationGuard],
  exports: [OffersService],
})
export class OffersModule {}


import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

/**
 * Offers Module
 *
 * PROTECTION LÉGALE: Importe ComplianceModule pour activer ConsentGuard.
 * Tous les endpoints d'offres sont protégés par @RequireConsent.
 */
@Module({
  imports: [PrismaModule, AuthModule, ComplianceModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}


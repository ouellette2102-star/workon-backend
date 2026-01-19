import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { LegalComplianceService } from './legal-compliance.service';
import { ConsentGuard } from './guards/consent.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

/**
 * Compliance Module - Gestion du consentement légal
 *
 * Fournit:
 * - Endpoints pour accepter/vérifier le consentement
 * - Guard pour bloquer les requêtes sans consentement
 * - Service réutilisable dans d'autres modules
 * - PR-07: Terms versioning, consent tracking, GDPR/Loi 25 hooks
 *
 * Conformité: Loi 25 Québec, GDPR, Apple App Store, Google Play
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({}),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, LegalComplianceService, ConsentGuard],
  exports: [ComplianceService, LegalComplianceService, ConsentGuard],
})
export class ComplianceModule {}


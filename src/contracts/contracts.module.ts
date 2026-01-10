import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

/**
 * Contracts Module
 *
 * PROTECTION LÉGALE: Importe ComplianceModule pour activer ConsentGuard.
 * Tous les endpoints de contrats sont protégés par @RequireConsent.
 */
@Module({
  imports: [PrismaModule, AuthModule, ComplianceModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}


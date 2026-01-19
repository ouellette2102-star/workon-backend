import { Module } from '@nestjs/common';
import { IdentityVerificationService } from './identity-verification.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Identity Module
 * PR-06: Identity Verification Hooks
 *
 * Provides identity verification services:
 * - Phone verification state management
 * - ID verification hooks
 * - Bank verification (Stripe Connect)
 * - Trust tier computation
 *
 * NOTE: Verification providers are NOT integrated yet.
 * This module provides hooks for future integration.
 */
@Module({
  imports: [PrismaModule],
  providers: [IdentityVerificationService],
  exports: [IdentityVerificationService],
})
export class IdentityModule {}


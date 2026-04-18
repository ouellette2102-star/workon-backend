import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IdentityController],
  providers: [IdentityVerificationService],
  exports: [IdentityVerificationService],
})
export class IdentityModule {}


import { Module } from '@nestjs/common';
import { MissionsLocalController } from './missions-local.controller';
import { MissionsLocalService } from './missions-local.service';
import { MissionsLocalRepository } from './missions-local.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule, // Import AuthModule for JwtAuthGuard and JwtService
  ],
  controllers: [MissionsLocalController],
  providers: [MissionsLocalService, MissionsLocalRepository],
  exports: [MissionsLocalService],
})
export class MissionsLocalModule {}


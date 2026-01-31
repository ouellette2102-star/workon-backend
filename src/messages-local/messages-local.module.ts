import { Module } from '@nestjs/common';
import { MessagesLocalController } from './messages-local.controller';
import { MessagesLocalService } from './messages-local.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * LocalMessages Module - Chat for LocalUser system
 * 
 * Provides messaging functionality for local missions.
 * Uses LocalMission and LocalUser models (not Clerk).
 * 
 * Imports AuthModule for JwtAuthGuard and JwtService (required for protected endpoints).
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule, // Provides JwtAuthGuard, JwtService for protected endpoints
  ],
  controllers: [MessagesLocalController],
  providers: [MessagesLocalService],
  exports: [MessagesLocalService],
})
export class MessagesLocalModule {}

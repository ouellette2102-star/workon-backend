import { Module } from '@nestjs/common';
import { MessagesLocalController } from './messages-local.controller';
import { MessagesLocalService } from './messages-local.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * LocalMessages Module - Chat for LocalUser system
 * 
 * Provides messaging functionality for local missions.
 * Uses LocalMission and LocalUser models (not Clerk).
 */
@Module({
  imports: [PrismaModule],
  controllers: [MessagesLocalController],
  providers: [MessagesLocalService],
  exports: [MessagesLocalService],
})
export class MessagesLocalModule {}

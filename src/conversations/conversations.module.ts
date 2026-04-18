import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactFilterService } from '../common/security/contact-filter.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ContactFilterService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

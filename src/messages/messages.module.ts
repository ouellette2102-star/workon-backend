import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { ConversationsController } from './conversations.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [MessagesController, ConversationsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}


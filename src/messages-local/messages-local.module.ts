import { Module } from '@nestjs/common';
import { MessagesLocalController } from './messages-local.controller';
import { MessagesLocalService } from './messages-local.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ContactFilterService } from '../common/security/contact-filter.service';

/**
 * LocalMessages Module - Chat for LocalUser system
 *
 * Anti-disintermediation: ContactFilterService redacts personal
 * contact info (phone, email, social handles) from messages.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MessagesLocalController],
  providers: [MessagesLocalService, ContactFilterService],
  exports: [MessagesLocalService],
})
export class MessagesLocalModule {}

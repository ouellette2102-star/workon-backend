/**
 * Mail Module
 *
 * Provides email functionality via Resend.
 * Import this module where email sending is needed.
 *
 * Environment variables:
 * - RESEND_API_KEY: Resend API key
 * - MAIL_FROM: Default sender email
 * - MAIL_FROM_NAME: Sender display name
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}


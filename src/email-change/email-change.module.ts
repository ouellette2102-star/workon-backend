/**
 * Email Change Module
 *
 * Provides email change functionality with OTP verification.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { EmailOtpService } from './email-otp.service';

@Module({
  imports: [PrismaModule, MailModule, ConfigModule],
  providers: [EmailOtpService],
  exports: [EmailOtpService],
})
export class EmailChangeModule {}

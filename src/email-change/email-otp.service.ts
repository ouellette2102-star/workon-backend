/**
 * Email OTP Service
 *
 * Handles secure OTP verification for email changes.
 *
 * Security features:
 * - OTP hashed with HMAC-SHA256 (never stored in plain)
 * - 10 minute expiration
 * - Max 5 attempts per request
 * - Rate limiting (1 request per userId per 60 seconds)
 * - Email uniqueness validation
 * - Audit fields (ip, userAgent)
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';

// Constants
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_SECONDS = 60;

export interface RequestOtpMeta {
  ip?: string;
  userAgent?: string;
}

export interface RequestEmailChangeResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  reason?: 'expired' | 'invalid' | 'max_attempts' | 'not_found';
  requestId?: string;
}

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly otpSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    // Get OTP secret from env (required in production)
    const secret = this.configService.get<string>('OTP_SECRET');
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    if (!secret && isProd) {
      throw new Error('OTP_SECRET is required in production');
    }

    this.otpSecret = secret || 'dev-otp-secret-not-for-production';

    if (!secret) {
      this.logger.warn('⚠️ OTP_SECRET not set - using insecure default (dev only)');
    }
  }

  /**
   * Request email change - generates OTP and sends to new email
   *
   * @param userId - Current user ID
   * @param newEmail - New email address to verify
   * @param meta - Optional metadata (ip, userAgent)
   */
  async requestEmailChangeOtp(
    userId: string,
    newEmail: string,
    meta?: RequestOtpMeta,
  ): Promise<RequestEmailChangeResult> {
    this.logger.log(`[EmailOtp] Request for userId=${userId}, newEmail=${this.maskEmail(newEmail)}`);

    // 1. Validate email format
    if (!this.isValidEmail(newEmail)) {
      throw new BadRequestException('Format d\'email invalide');
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    // 2. Check if email is already used by another user
    const existingUser = await this.prisma.localUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      // Security: don't reveal if email exists (prevent enumeration)
      this.logger.warn(`[EmailOtp] Email already in use: ${this.maskEmail(newEmail)}`);
      // Still return success to prevent email enumeration
      return {
        success: true,
        message: 'Si cet email est disponible, un code de vérification a été envoyé.',
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      };
    }

    // 3. Check rate limit - no request for this userId in last 60 seconds
    const recentRequest = await this.prisma.emailOtp.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentRequest) {
      const waitSeconds = Math.ceil(
        (recentRequest.createdAt.getTime() + RATE_LIMIT_SECONDS * 1000 - Date.now()) / 1000,
      );
      this.logger.warn(`[EmailOtp] Rate limit hit for userId=${userId}`);
      throw new BadRequestException(
        `Veuillez patienter ${waitSeconds} secondes avant de demander un nouveau code.`,
      );
    }

    // 4. Generate OTP and hash
    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Create request in database
    const request = await this.prisma.emailOtp.create({
      data: {
        userId,
        newEmail: normalizedEmail,
        codeHash,
        expiresAt,
        ip: meta?.ip || null,
        userAgent: meta?.userAgent?.substring(0, 500) || null, // Limit userAgent length
      },
    });

    this.logger.log(`[EmailOtp] Request created: ${request.id}, expires: ${expiresAt.toISOString()}`);

    // 6. Send OTP email
    const emailResult = await this.mailService.sendOtpEmail({
      to: newEmail,
      otp,
      purpose: 'email-change',
    });

    if (!emailResult.success) {
      this.logger.error(`[EmailOtp] Failed to send OTP email: ${emailResult.error}`);
      // Don't expose email sending errors to user
    }

    return {
      success: true,
      message: 'Un code de vérification a été envoyé à votre nouvelle adresse email.',
      expiresAt,
    };
  }

  /**
   * Verify OTP code
   *
   * @param userId - Current user ID
   * @param newEmail - New email address
   * @param code - OTP code entered by user
   */
  async verifyEmailChangeOtp(
    userId: string,
    newEmail: string,
    code: string,
  ): Promise<VerifyOtpResult> {
    this.logger.log(`[EmailOtp] Verify OTP for userId=${userId}, newEmail=${this.maskEmail(newEmail)}`);

    const normalizedEmail = newEmail.toLowerCase().trim();

    // 1. Find the most recent valid request
    const request = await this.prisma.emailOtp.findFirst({
      where: {
        userId,
        newEmail: normalizedEmail,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      return {
        success: false,
        message: 'Aucune demande de changement d\'email en cours.',
        reason: 'not_found',
      };
    }

    // 2. Check expiration
    if (request.expiresAt < new Date()) {
      this.logger.warn(`[EmailOtp] Expired OTP for request ${request.id}`);
      return {
        success: false,
        message: 'Le code a expiré. Veuillez demander un nouveau code.',
        reason: 'expired',
      };
    }

    // 3. Check max attempts
    if (request.attempts >= MAX_ATTEMPTS) {
      this.logger.warn(`[EmailOtp] Max attempts exceeded for request ${request.id}`);
      return {
        success: false,
        message: 'Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.',
        reason: 'max_attempts',
      };
    }

    // 4. Increment attempts BEFORE verification (prevent timing attacks)
    await this.prisma.emailOtp.update({
      where: { id: request.id },
      data: { attempts: { increment: 1 } },
    });

    // 5. Verify OTP using timing-safe comparison
    const isValid = this.verifyOtp(code, request.codeHash);

    if (!isValid) {
      const remainingAttempts = MAX_ATTEMPTS - request.attempts - 1;
      this.logger.warn(`[EmailOtp] Invalid OTP for request ${request.id}. Remaining: ${remainingAttempts}`);
      
      return {
        success: false,
        message: remainingAttempts > 0
          ? `Code incorrect. ${remainingAttempts} tentative(s) restante(s).`
          : 'Code incorrect. Nombre maximum de tentatives atteint.',
        reason: 'invalid',
      };
    }

    // 6. Mark as consumed
    await this.prisma.emailOtp.update({
      where: { id: request.id },
      data: { consumedAt: new Date() },
    });

    this.logger.log(`[EmailOtp] OTP verified successfully for request ${request.id}`);

    return {
      success: true,
      message: 'Code vérifié avec succès.',
      requestId: request.id,
    };
  }

  /**
   * Apply email change after OTP verification
   * This is called after verifyEmailChangeOtp succeeds
   *
   * @param userId - User ID
   * @param requestId - Email change request ID from verifyOtp
   */
  async applyEmailChange(userId: string, requestId: string): Promise<{ success: boolean; newEmail: string }> {
    const request = await this.prisma.emailOtp.findUnique({
      where: { id: requestId },
    });

    if (!request || request.userId !== userId || !request.consumedAt) {
      throw new BadRequestException('Demande de changement d\'email invalide.');
    }

    // Double-check email availability
    const existingUser = await this.prisma.localUser.findUnique({
      where: { email: request.newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Cette adresse email est déjà utilisée.');
    }

    // Update user email
    await this.prisma.localUser.update({
      where: { id: userId },
      data: {
        email: request.newEmail,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`[EmailOtp] Email updated for userId=${userId} to ${this.maskEmail(request.newEmail)}`);

    return { success: true, newEmail: request.newEmail };
  }

  /**
   * Clean up expired requests (can be called by a cron job)
   */
  async cleanupExpiredRequests(): Promise<number> {
    const result = await this.prisma.emailOtp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { consumedAt: { not: null } },
        ],
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24h
      },
    });

    if (result.count > 0) {
      this.logger.log(`[EmailOtp] Cleaned up ${result.count} expired requests`);
    }

    return result.count;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Generate a secure 6-digit OTP
   */
  private generateOtp(): string {
    // Generate a random 6-digit number (100000-999999)
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Hash OTP using HMAC-SHA256
   */
  private hashOtp(otp: string): string {
    return createHmac('sha256', this.otpSecret)
      .update(otp)
      .digest('hex');
  }

  /**
   * Verify OTP using timing-safe comparison
   */
  private verifyOtp(otp: string, storedHash: string): boolean {
    const hash = this.hashOtp(otp);
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Mask email for logging (security)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local.length > 2 
      ? `${local[0]}***${local[local.length - 1]}`
      : '***';
    return `${maskedLocal}@${domain}`;
  }
}


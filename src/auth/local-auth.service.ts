import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Local Authentication Service
 * 
 * Handles email/password authentication with JWT tokens.
 * Supports: register, login, refresh, forgot-password, reset-password
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  // Token expiration times
  private readonly ACCESS_TOKEN_EXPIRY = '15m';  // Short-lived
  private readonly REFRESH_TOKEN_EXPIRY = '7d';  // Long-lived
  private readonly RESET_TOKEN_EXPIRY = '15m';   // Password reset

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a new user
   * Returns access token, refresh token, and user info
   */
  async register(registerDto: RegisterDto) {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    // Create user (UsersService handles validation + hashing)
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  /**
   * Login with email/password
   * Returns access token, refresh token, and user info
   */
  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for: ${loginDto.email}`);

    // Find user by email (includes hashedPassword for verification)
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.active) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Verify password
    const isPasswordValid = await this.usersService.verifyPassword(
      loginDto.password,
      user.hashedPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    // Remove hashedPassword from response
    const { hashedPassword, ...userWithoutPassword } = user;

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: plainToInstance(UserResponseDto, userWithoutPassword, {
        excludeExtraneousValues: true,
      }),
    };
  }

  /**
   * Refresh access token using refresh token
   * Returns new access token and rotated refresh token
   */
  async refreshTokens(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      
      if (!refreshSecret) {
        throw new UnauthorizedException('Refresh token configuration missing');
      }

      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      // Validate user still exists and is active
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || !user.active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens (rotation)
      const newAccessToken = this.generateAccessToken(user.id, user.role);
      const newRefreshToken = this.generateRefreshToken(user.id);

      this.logger.log(`Tokens refreshed for user: ${user.id}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.warn(`Refresh token failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Request password reset
   * Returns reset token (DEV: also returns token in response for testing)
   * PROD: Would send email with reset link
   */
  async forgotPassword(email: string) {
    this.logger.log(`Password reset requested for: ${email}`);

    // Find user - don't reveal if email exists (security)
    const user = await this.usersService.findByEmail(email);

    // Always return success message (security: don't reveal if email exists)
    const response: { message: string; resetToken?: string } = {
      message: 'If this email exists, a reset link has been sent',
    };

    if (user && user.active) {
      // Generate reset token with user ID and email
      const resetToken = this.generateResetToken(user.id, user.email);

      // In production: send email with reset link
      // For now: log token (dev) or include in response (dev only)
      const isProd = this.configService.get<string>('NODE_ENV') === 'production';
      
      if (!isProd) {
        // DEV ONLY: Return token for testing
        response.resetToken = resetToken;
        this.logger.log(`[DEV] Reset token for ${email}: ${resetToken.substring(0, 20)}...`);
      } else {
        // PROD: Would send email here
        this.logger.log(`Password reset token generated for: ${email}`);
      }
    }

    return response;
  }

  /**
   * Reset password with token
   * Validates token and updates password
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const resetSecret = this.getResetTokenSecret();

      // Verify reset token
      const payload = this.jwtService.verify(token, {
        secret: resetSecret,
      });

      // Check token type
      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      // Get user
      const user = await this.usersService.findByEmail(payload.email);
      
      if (!user || !user.active) {
        throw new BadRequestException('User not found or inactive');
      }

      // Update password
      await this.usersService.updatePassword(user.id, newPassword);

      this.logger.log(`Password reset successfully for: ${user.email}`);

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(`Password reset failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  // ============================================
  // EMAIL CHANGE (OTP)
  // ============================================

  async requestEmailChange(userId: string, newEmail: string) {
    const normalized = newEmail.trim().toLowerCase();

    // Ensure user exists
    await this.usersService.findById(userId);

    // Ensure email not already in use
    const existing = await this.usersService.findByEmail(normalized);
    if (existing && existing.id !== userId) {
      throw new BadRequestException({
        errorCode: 'EMAIL_IN_USE',
        message: 'Cette adresse email est déjà utilisée.',
      });
    }

    // Generate OTP (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.localEmailChangeRequest.upsert({
      where: {
        userId_newEmail: { userId, newEmail: normalized },
      },
      update: {
        code,
        attempts: 0,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        id: `chg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId,
        newEmail: normalized,
        code,
        expiresAt,
      },
    });

    // In prod this would be emailed. Here we return ok only.
    return { ok: true };
  }

  async verifyEmailOtp(userId: string, newEmail: string, code: string) {
    const normalized = newEmail.trim().toLowerCase();

    const request = await this.prisma.localEmailChangeRequest.findUnique({
      where: {
        userId_newEmail: { userId, newEmail: normalized },
      },
    });

    if (!request) {
      throw new BadRequestException({
        errorCode: 'OTP_NOT_FOUND',
        message: 'Aucune demande de changement trouvée. Recommencez.',
      });
    }

    if (request.expiresAt < new Date()) {
      throw new BadRequestException({
        errorCode: 'OTP_EXPIRED',
        message: 'Code expiré. Demandez un nouveau code.',
      });
    }

    if (request.attempts >= 5) {
      throw new BadRequestException({
        errorCode: 'OTP_LOCKED',
        message: 'Trop de tentatives. Demandez un nouveau code.',
      });
    }

    if (request.code !== code.trim()) {
      await this.prisma.localEmailChangeRequest.update({
        where: { id: request.id },
        data: { attempts: request.attempts + 1, updatedAt: new Date() },
      });
      throw new BadRequestException({
        errorCode: 'OTP_INVALID',
        message: 'Code incorrect. Vérifiez et réessayez.',
      });
    }

    await this.usersService.updateEmail(userId, normalized);
    await this.prisma.localEmailChangeRequest.delete({
      where: { id: request.id },
    });

    return { ok: true };
  }

  /**
   * Validate user from JWT payload
   * Used by JWT strategy
   */
  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  // ============================================
  // PRIVATE: Token Generation
  // ============================================

  /**
   * Generate short-lived access token
   */
  private generateAccessToken(userId: string, role: string): string {
    const payload = {
      sub: userId,
      role,
      provider: 'local',
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate long-lived refresh token
   */
  private generateRefreshToken(userId: string): string {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const payload = {
      sub: userId,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate password reset token
   */
  private generateResetToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: 'password-reset',
    };

    return this.jwtService.sign(payload, {
      secret: this.getResetTokenSecret(),
      expiresIn: this.RESET_TOKEN_EXPIRY,
    });
  }

  /**
   * Get reset token secret (derived from JWT_SECRET)
   */
  private getResetTokenSecret(): string {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    // Use a derived secret for reset tokens
    return `${jwtSecret}-reset`;
  }
}

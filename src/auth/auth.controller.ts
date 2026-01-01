import { Controller, Post, Body, UseGuards, Get, Request, HttpCode, HttpStatus, Logger, Req, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { LocalAuthService } from './local-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ForgotPasswordResponseDto } from './dto/forgot-password.dto';
import { ResetPasswordDto, ResetPasswordResponseDto } from './dto/reset-password.dto';
import { ChangeEmailDto, ChangeEmailResponseDto } from './dto/change-email.dto';
import { VerifyEmailOtpDto, VerifyEmailOtpResponseDto } from './dto/verify-email-otp.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailOtpService } from '../email-change/email-otp.service';
import { plainToInstance } from 'class-transformer';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly localAuthService: LocalAuthService,
    private readonly emailOtpService: EmailOtpService,
  ) {}

  // ============================================
  // REGISTRATION & LOGIN
  // ============================================

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account and returns JWT tokens',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.localAuthService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email/password',
    description: 'Authenticates user and returns JWT tokens (access + refresh)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.localAuthService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user',
    description: 'Returns current user info from JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user info',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: { user: { sub: string } }): Promise<UserResponseDto> {
    // PR-8: Log profile fetch for debugging
    this.logger.log(`[GET /auth/me] userId=${req.user.sub}`);
    try {
      const user = await this.localAuthService.validateUser(req.user.sub);
      this.logger.log(`[GET /auth/me] Success for userId=${req.user.sub}`);
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`[GET /auth/me] Error for userId=${req.user.sub}: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange refresh token for new access + refresh tokens (rotation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    return this.localAuthService.refreshTokens(refreshDto.refreshToken);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends password reset email (DEV: returns token in response)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset request processed',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.localAuthService.forgotPassword(forgotDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Validates reset token and updates password',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetDto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    return this.localAuthService.resetPassword(resetDto.token, resetDto.newPassword);
  }

  // ============================================
  // EMAIL CHANGE (PR-B2)
  // ============================================

  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request email change',
    description: 'Sends OTP code to new email address for verification. Rate limited to 1 request per 60 seconds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Request processed (neutral response to prevent email enumeration)',
    type: ChangeEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or rate limited' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changeEmail(
    @Body() dto: ChangeEmailDto,
    @Request() req: { user: { sub: string } },
    @Req() expressReq: ExpressRequest,
  ): Promise<ChangeEmailResponseDto> {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.headers['x-forwarded-for']?.toString() || 'unknown';
    const userAgent = expressReq.headers['user-agent'] || 'unknown';

    this.logger.log(`[POST /auth/change-email] userId=${userId}, newEmail=${this.maskEmail(dto.newEmail)}`);

    try {
      // Get current user to check if email is the same
      const currentUser = await this.localAuthService.validateUser(userId);
      
      if (currentUser.email.toLowerCase() === dto.newEmail.toLowerCase().trim()) {
        this.logger.log(`[POST /auth/change-email] No-op: same email for userId=${userId}`);
        return {
          ok: true,
          message: 'Votre email est déjà à jour.',
        };
      }

      const result = await this.emailOtpService.requestEmailChangeOtp(
        userId,
        dto.newEmail,
        { ip, userAgent },
      );

      return {
        ok: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.warn(`[POST /auth/change-email] Error for userId=${userId}: ${error.message}`);
      
      // Handle rate limit errors
      if (error.message?.includes('patienter')) {
        return {
          ok: false,
          errorCode: 'RATE_LIMITED',
          message: error.message,
        };
      }
      
      // Handle invalid email format
      if (error.message?.includes('email invalide')) {
        return {
          ok: false,
          errorCode: 'INVALID_EMAIL',
          message: error.message,
        };
      }

      throw error;
    }
  }

  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify email change OTP',
    description: 'Verifies OTP code and updates user email if valid. Max 5 attempts per OTP request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email successfully updated',
    type: VerifyEmailOtpResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP, expired, or max attempts reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto,
    @Request() req: { user: { sub: string } },
  ): Promise<VerifyEmailOtpResponseDto> {
    const userId = req.user.sub;

    this.logger.log(`[POST /auth/verify-email-otp] userId=${userId}, newEmail=${this.maskEmail(dto.newEmail)}`);

    try {
      // Step 1: Verify OTP
      const verifyResult = await this.emailOtpService.verifyEmailChangeOtp(
        userId,
        dto.newEmail,
        dto.code,
      );

      if (!verifyResult.success) {
        // Map reason to error code
        const errorCodeMap: Record<string, string> = {
          'expired': 'OTP_EXPIRED',
          'invalid': 'OTP_INVALID',
          'max_attempts': 'OTP_LOCKED',
          'not_found': 'OTP_NOT_FOUND',
        };

        return {
          ok: false,
          errorCode: errorCodeMap[verifyResult.reason || 'invalid'] || 'OTP_INVALID',
          message: verifyResult.message,
        };
      }

      // Step 2: Apply email change
      const applyResult = await this.emailOtpService.applyEmailChange(userId, verifyResult.requestId!);

      this.logger.log(`[POST /auth/verify-email-otp] Success for userId=${userId}, newEmail=${this.maskEmail(applyResult.newEmail)}`);

      // TODO: Invalidate refresh tokens if needed for security
      // This would require adding a method to LocalAuthService

      return {
        ok: true,
        message: 'Votre adresse email a été mise à jour avec succès.',
      };
    } catch (error) {
      this.logger.error(`[POST /auth/verify-email-otp] Error for userId=${userId}: ${error.message}`);

      // Handle email already in use (race condition)
      if (error.message?.includes('déjà utilisée')) {
        return {
          ok: false,
          errorCode: 'EMAIL_IN_USE',
          message: error.message,
        };
      }

      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

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

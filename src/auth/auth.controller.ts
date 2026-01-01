import { Controller, Post, Body, UseGuards, Get, Delete, Request, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocalAuthService } from './local-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ForgotPasswordResponseDto } from './dto/forgot-password.dto';
import { ResetPasswordDto, ResetPasswordResponseDto } from './dto/reset-password.dto';
import { DeleteAccountDto, DeleteAccountResponseDto } from './dto/delete-account.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { plainToInstance } from 'class-transformer';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly localAuthService: LocalAuthService,
    private readonly usersService: UsersService,
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
  // ACCOUNT DELETION (PR-B3)
  // ============================================

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete user account (GDPR)',
    description: `Permanently deletes the user account with GDPR compliance:
    - Anonymizes all PII (email, name, phone, etc.)
    - Cancels open missions created by the user
    - Unassigns the user from pending missions
    - Invalidates authentication (cannot login after deletion)
    - Preserves completed/paid missions for audit
    
    Requires explicit confirmation: body must contain { "confirm": "DELETE" }`,
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    type: DeleteAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Confirmation required or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async deleteAccount(
    @Body() dto: DeleteAccountDto,
    @Request() req: { user: { sub: string } },
  ): Promise<DeleteAccountResponseDto> {
    const userId = req.user.sub;

    this.logger.warn(`[DELETE /auth/account] Account deletion requested for userId=${userId}`);

    try {
      // Validate confirmation (handled by DTO validation, but double-check)
      if (dto.confirm !== 'DELETE') {
        return {
          ok: false,
          errorCode: 'CONFIRM_REQUIRED',
          message: 'Veuillez saisir "DELETE" pour confirmer la suppression de votre compte.',
        };
      }

      // Perform GDPR-compliant deletion
      const result = await this.usersService.deleteAccount(userId);

      this.logger.warn(
        `[DELETE /auth/account] Account deleted: userId=${userId}, ` +
        `cancelledMissions=${result.cancelledMissionsCount}, ` +
        `unassignedMissions=${result.unassignedMissionsCount}`
      );

      return {
        ok: true,
        message: 'Votre compte a été supprimé. Toutes vos données personnelles ont été anonymisées.',
      };
    } catch (error) {
      this.logger.error(`[DELETE /auth/account] Error for userId=${userId}: ${error.message}`);

      // Handle specific errors
      if (error.message?.includes('not found')) {
        return {
          ok: false,
          errorCode: 'ACCOUNT_NOT_FOUND',
          message: 'Compte introuvable.',
        };
      }

      return {
        ok: false,
        errorCode: 'DELETION_FAILED',
        message: 'Une erreur est survenue lors de la suppression. Veuillez réessayer.',
      };
    }
  }
}

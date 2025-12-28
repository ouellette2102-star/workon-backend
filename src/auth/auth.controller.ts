import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
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
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './dto/reset-password.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly localAuthService: LocalAuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account and returns JWT token',
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
  @ApiOperation({
    summary: 'Login with email/password',
    description: 'Authenticates user and returns JWT token',
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
  @ApiBearerAuth('JWT')
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
  async getMe(@Request() req: any): Promise<UserResponseDto> {
    // User already validated by JwtAuthGuard
    // req.user contains: { sub, email, role, provider }

    // Fetch full user details
    const user = await this.localAuthService.validateUser(req.user.sub);

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASSWORD RESET ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset link to the user email. ' +
      'Always returns success to prevent email enumeration. ' +
      'In dev mode, the token is logged to console.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset request processed',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.localAuthService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets the user password using the token received by email. ' +
      'Token is valid for 15 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.localAuthService.resetPassword(dto);
  }
}


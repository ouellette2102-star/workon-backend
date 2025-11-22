import { Injectable, NotImplementedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * AuthService (Deprecated)
 * 
 * This service is deprecated and should not be used for new code.
 * Use one of the following instead:
 * - LocalAuthService for email/password authentication
 * - ClerkAuthService for Clerk-based authentication
 * 
 * This file is kept for backward compatibility only.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @deprecated Use LocalAuthService.register() instead
   */
  async register(signupDto: SignupDto) {
    throw new NotImplementedException(
      'AuthService.register() is deprecated. Use LocalAuthService.register() or Clerk authentication instead.',
    );
  }

  /**
   * @deprecated Use LocalAuthService.register() instead
   */
  async signup(signupDto: SignupDto) {
    return this.register(signupDto);
  }

  /**
   * @deprecated Use LocalAuthService.login() instead
   */
  async login(loginDto: LoginDto) {
    throw new NotImplementedException(
      'AuthService.login() is deprecated. Use LocalAuthService.login() or Clerk authentication instead.',
    );
  }

  /**
   * @deprecated JWT refresh is handled automatically by the client
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    throw new NotImplementedException(
      'AuthService.refreshToken() is deprecated. Use LocalAuthService or Clerk authentication instead.',
    );
  }

  /**
   * Logout (client-side token removal)
   */
  async logout(userId: string) {
    this.logger.log(`Logout requested for user: ${userId}`);
    return { message: 'Logged out successfully. Please remove tokens from client.' };
  }

  /**
   * @deprecated Use LocalAuthService.validateUser() instead
   */
  async validateUser(email: string, password: string): Promise<any> {
    throw new NotImplementedException(
      'AuthService.validateUser() is deprecated. Use LocalAuthService instead.',
    );
  }
}

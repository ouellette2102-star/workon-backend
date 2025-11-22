import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../users/dto/user-response.dto';

/**
 * Local Authentication Service
 * 
 * Handles email/password authentication (separate from Clerk)
 * Used for local development and testing
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   * 
   * @param registerDto - User registration data
   * @returns JWT token + user info
   */
  async register(registerDto: RegisterDto) {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    // Create user (UsersService handles validation + hashing)
    const user = await this.usersService.create(registerDto);

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.role);

    return {
      accessToken,
      user: plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  /**
   * Login with email/password
   * 
   * @param loginDto - Login credentials
   * @returns JWT token + user info
   * @throws UnauthorizedException if credentials invalid
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

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.role);

    // Remove hashedPassword from response
    const { hashedPassword, ...userWithoutPassword } = user;

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken,
      user: plainToInstance(UserResponseDto, userWithoutPassword, {
        excludeExtraneousValues: true,
      }),
    };
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

  /**
   * Generate JWT access token
   * 
   * @param userId - User ID
   * @param role - User role
   * @returns JWT token string
   */
  private generateToken(userId: string, role: string): string {
    const payload = {
      sub: userId,
      role,
      provider: 'local', // Distinguish from Clerk tokens
    };

    const expiresIn = this.configService.get<string>(
      'JWT_EXPIRATION',
      '7d', // Default: 7 days
    );

    return this.jwtService.sign(payload, { expiresIn });
  }
}


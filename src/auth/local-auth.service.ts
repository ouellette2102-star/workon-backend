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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { randomBytes } from 'crypto';

/**
 * Local Authentication Service
 * 
 * Handles email/password authentication (separate from Clerk)
 * Used for local development and testing
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  /**
   * In-memory store for password reset tokens
   * Structure: Map<token, { email: string, expiresAt: Date, userId: string }>
   * 
   * NOTE: Pour production, remplacer par stockage en base de données
   * ou Redis pour persistance multi-instance.
   */
  private readonly resetTokens = new Map<
    string,
    { email: string; expiresAt: Date; userId: string }
  >();

  /** Durée de validité du token reset (15 minutes) */
  private readonly RESET_TOKEN_EXPIRY_MINUTES = 15;

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

  // ─────────────────────────────────────────────────────────────────────────
  // PASSWORD RESET FLOW
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Request password reset (forgot password)
   * 
   * Génère un token temporaire et log en dev (ou envoie email en prod).
   * Retourne toujours succès pour éviter l'énumération d'emails.
   * 
   * @param dto - Contains user email
   * @returns Success message (always, for security)
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = dto;
    this.logger.log(`Password reset requested for: ${email}`);

    // Chercher l'utilisateur (silencieusement)
    const user = await this.usersService.findByEmail(email);

    if (user && user.active) {
      // Générer un token sécurisé
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + this.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      );

      // Stocker le token
      this.resetTokens.set(token, {
        email: user.email,
        userId: user.id,
        expiresAt,
      });

      // Nettoyer les vieux tokens (maintenance)
      this.cleanupExpiredTokens();

      // En DEV: Log le token pour faciliter les tests
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      if (nodeEnv !== 'production') {
        this.logger.warn(
          `[DEV ONLY] Reset token for ${email}: ${token} (expires: ${expiresAt.toISOString()})`,
        );
      } else {
        // En PROD: Ici on enverrait un email
        // TODO: Intégrer service email (SendGrid, AWS SES, etc.)
        this.logger.log(`Password reset email would be sent to: ${email}`);
      }
    } else {
      // Utilisateur non trouvé ou inactif - ne rien révéler
      this.logger.debug(`No active user found for email: ${email} (silent)`);
    }

    // Toujours retourner succès pour éviter l'énumération
    return {
      message:
        'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
    };
  }

  /**
   * Reset password with token
   * 
   * Vérifie le token et met à jour le mot de passe.
   * 
   * @param dto - Contains email, token, and new password
   * @returns Success confirmation
   * @throws BadRequestException if token invalid/expired
   */
  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email, token, newPassword } = dto;
    this.logger.log(`Password reset attempt for: ${email}`);

    // Vérifier le token
    const tokenData = this.resetTokens.get(token);

    if (!tokenData) {
      this.logger.warn(`Invalid reset token used for: ${email}`);
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré.',
      );
    }

    // Vérifier l'expiration
    if (tokenData.expiresAt < new Date()) {
      this.resetTokens.delete(token);
      this.logger.warn(`Expired reset token used for: ${email}`);
      throw new BadRequestException(
        'Token de réinitialisation expiré. Veuillez en demander un nouveau.',
      );
    }

    // Vérifier que l'email correspond
    if (tokenData.email.toLowerCase() !== email.toLowerCase()) {
      this.logger.warn(
        `Email mismatch for reset token: expected ${tokenData.email}, got ${email}`,
      );
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré.',
      );
    }

    // Mettre à jour le mot de passe
    await this.usersService.updatePassword(tokenData.userId, newPassword);

    // Supprimer le token utilisé
    this.resetTokens.delete(token);

    // Invalider tous les autres tokens pour cet utilisateur
    this.invalidateUserTokens(tokenData.userId);

    this.logger.log(`Password successfully reset for: ${email}`);

    return {
      success: true,
      message: 'Mot de passe réinitialisé avec succès.',
    };
  }

  /**
   * Nettoie les tokens expirés (maintenance)
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [token, data] of this.resetTokens.entries()) {
      if (data.expiresAt < now) {
        this.resetTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired reset tokens`);
    }
  }

  /**
   * Invalide tous les tokens reset d'un utilisateur
   */
  private invalidateUserTokens(userId: string): void {
    for (const [token, data] of this.resetTokens.entries()) {
      if (data.userId === userId) {
        this.resetTokens.delete(token);
      }
    }
  }
}


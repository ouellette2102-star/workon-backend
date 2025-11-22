import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { LocalAuthService } from '../local-auth.service';

/**
 * JWT Strategy for Local Authentication
 * 
 * Validates JWT tokens issued by LocalAuthService
 * Separate from Clerk authentication
 */
@Injectable()
export class JwtLocalStrategy extends PassportStrategy(Strategy, 'jwt-local') {
  constructor(
    private readonly configService: ConfigService,
    private readonly localAuthService: LocalAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload and return user
   * Called automatically by Passport after token verification
   */
  async validate(payload: any) {
    // Payload contains: { sub: userId, role, provider }
    
    // Only validate local tokens (not Clerk tokens)
    if (payload.provider !== 'local') {
      throw new UnauthorizedException('Invalid token provider');
    }

    // Fetch user from database
    const user = await this.localAuthService.validateUser(payload.sub);

    // Return user object (available in request.user)
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      provider: 'local',
    };
  }
}


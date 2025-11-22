import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { LocalAuthService } from '../local-auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly localAuthService: LocalAuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    // LocalAuthService.login() handles validation, but for passport strategy
    // we need a simpler validateUser method
    // For now, this strategy is not used since we handle login directly in controller
    throw new UnauthorizedException('Use /auth/login endpoint instead of passport local strategy');
  }
}


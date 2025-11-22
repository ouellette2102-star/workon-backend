import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JWT Authentication Guard (Local Auth Only)
 * 
 * Verifies JWT tokens issued by LocalAuthService.
 * Clerk authentication has been disabled.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authorization manquante');
    }

    // ⚠️ SÉCURITÉ: Ne jamais logger les tokens complets en production
    // Les tokens sont des secrets qui peuvent être utilisés pour usurper l'identité

    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET not configured');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: jwtSecret });
      
      // ⚠️ SÉCURITÉ CRITIQUE: Le rôle et l'ID viennent UNIQUEMENT du JWT vérifié
      // Ne jamais accepter de valeurs fournies par le frontend (body/query/headers)
      request.user = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role, // Extrait du JWT signé uniquement
        provider: 'local',
        userId: payload.sub, // Add userId for compatibility with other services
      };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}


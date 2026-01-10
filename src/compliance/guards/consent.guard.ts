import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ComplianceService } from '../compliance.service';

/**
 * Décorateur pour marquer un endpoint comme nécessitant un consentement
 */
export const REQUIRE_CONSENT_KEY = 'requireConsent';
export const RequireConsent = () => SetMetadata(REQUIRE_CONSENT_KEY, true);

/**
 * Consent Guard - Vérification du consentement légal
 *
 * Bloque les requêtes des utilisateurs n'ayant pas accepté
 * les documents légaux requis (Terms, Privacy).
 *
 * IMPORTANT: Ce guard est fail-closed (blocage par défaut).
 * Aucun bypass, aucun override admin.
 *
 * Conformité: Loi 25 Québec, GDPR
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly complianceService: ComplianceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier si le décorateur @RequireConsent est présent
    const requireConsent = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_CONSENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si pas de décorateur, laisser passer
    if (!requireConsent) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Pas d'utilisateur = pas de vérification de consentement ici
    // (le JwtAuthGuard gère l'authentification)
    if (!user || !user.sub) {
      return true; // Laisse JwtAuthGuard gérer l'erreur 401
    }

    try {
      // Vérifier le consentement
      await this.complianceService.requireValidConsent(user.sub);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        // Logger pour audit (sans données sensibles)
        this.logger.warn(
          `Consentement manquant pour user ${user.sub.substring(0, 8)}... - Endpoint: ${request.method} ${request.url}`,
        );
        throw error;
      }
      throw error;
    }
  }
}


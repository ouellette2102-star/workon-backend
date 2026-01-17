import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * AuditLogger - Logging structuré pour événements métier critiques
 * PR-I2: Production Monitoring Hardening
 *
 * Usage:
 *   this.auditLogger.logBusinessEvent('CONSENT_ACCEPTED', { userId, documentType, version });
 *
 * Garanties:
 * - PII-safe: aucune donnée personnelle sensible
 * - Structured: format JSON pour parsing automatique
 * - Traceable: correlationId inclus
 * - Sentry-integrated: erreurs reportées automatiquement
 */
@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('AUDIT');

  /**
   * Liste des événements métier critiques traçables
   */
  static readonly EVENTS = {
    // Compliance
    CONSENT_ACCEPTED: 'consent.accepted',
    CONSENT_CHECK_FAILED: 'consent.check_failed',

    // Payments
    PAYMENT_INITIATED: 'payment.initiated',
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_REFUNDED: 'payment.refunded',
    CHECKOUT_STARTED: 'checkout.started',
    CHECKOUT_COMPLETED: 'checkout.completed',

    // Contracts
    CONTRACT_CREATED: 'contract.created',
    CONTRACT_SIGNED: 'contract.signed',
    CONTRACT_COMPLETED: 'contract.completed',
    CONTRACT_CANCELLED: 'contract.cancelled',

    // Offers
    OFFER_CREATED: 'offer.created',
    OFFER_ACCEPTED: 'offer.accepted',
    OFFER_DECLINED: 'offer.declined',
    OFFER_WITHDRAWN: 'offer.withdrawn',

    // Missions
    MISSION_CREATED: 'mission.created',
    MISSION_ASSIGNED: 'mission.assigned',
    MISSION_COMPLETED: 'mission.completed',
    MISSION_CANCELLED: 'mission.cancelled',

    // Auth (critiques)
    USER_REGISTERED: 'user.registered',
    USER_DELETED: 'user.deleted',
    LOGIN_FAILED: 'auth.login_failed',

    // Admin
    ADMIN_ACTION: 'admin.action',
  } as const;

  /**
   * Clés sensibles à redacter automatiquement
   */
  private readonly SENSITIVE_KEYS = [
    'password',
    'secret',
    'token',
    'apikey',
    'authorization',
    'stripe_key',
    'jwt',
    'cookie',
    'session',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
    'sin', // Social Insurance Number (Canada)
    'email', // Redact email in detailed logs
    'phone',
    'ip_address',
  ];

  /**
   * Log un événement métier critique
   *
   * @param event - Type d'événement (utiliser AuditLoggerService.EVENTS)
   * @param data - Données associées (seront sanitizées automatiquement)
   * @param correlationId - ID de corrélation de la requête (optionnel)
   */
  logBusinessEvent(
    event: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): void {
    const sanitizedData = this.sanitize(data);

    const logEntry = {
      type: 'BUSINESS_EVENT',
      event,
      correlationId: correlationId || 'system',
      timestamp: new Date().toISOString(),
      ...sanitizedData,
    };

    this.logger.log(JSON.stringify(logEntry));

    // Breadcrumb Sentry pour le contexte
    Sentry.addBreadcrumb({
      category: 'audit',
      message: event,
      level: 'info',
      data: sanitizedData,
    });
  }

  /**
   * Log une erreur métier critique avec report Sentry
   *
   * @param event - Type d'événement
   * @param error - Erreur ou message
   * @param data - Données contextuelles
   * @param correlationId - ID de corrélation
   */
  logBusinessError(
    event: string,
    error: Error | string,
    data: Record<string, unknown> = {},
    correlationId?: string,
  ): void {
    const sanitizedData = this.sanitize(data);
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const logEntry = {
      type: 'BUSINESS_ERROR',
      event,
      correlationId: correlationId || 'system',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      ...sanitizedData,
    };

    this.logger.error(JSON.stringify(logEntry), errorStack);

    // Report à Sentry
    Sentry.withScope((scope) => {
      scope.setTag('event_type', event);
      scope.setExtra('data', sanitizedData);
      if (correlationId) {
        scope.setTag('correlation_id', correlationId);
      }

      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Log un avertissement métier
   */
  logBusinessWarning(
    event: string,
    message: string,
    data: Record<string, unknown> = {},
    correlationId?: string,
  ): void {
    const sanitizedData = this.sanitize(data);

    const logEntry = {
      type: 'BUSINESS_WARNING',
      event,
      message,
      correlationId: correlationId || 'system',
      timestamp: new Date().toISOString(),
      ...sanitizedData,
    };

    this.logger.warn(JSON.stringify(logEntry));
  }

  /**
   * Créer un contexte de log avec correlationId pré-rempli
   * Utile pour les services qui traitent une requête
   */
  withCorrelationId(correlationId: string) {
    return {
      logEvent: (event: string, data: Record<string, unknown>) =>
        this.logBusinessEvent(event, data, correlationId),
      logError: (
        event: string,
        error: Error | string,
        data: Record<string, unknown> = {},
      ) => this.logBusinessError(event, error, data, correlationId),
      logWarning: (event: string, message: string, data: Record<string, unknown> = {}) =>
        this.logBusinessWarning(event, message, data, correlationId),
    };
  }

  /**
   * Sanitize les données pour éviter les fuites de PII
   */
  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.SENSITIVE_KEYS.some((sk) =>
        lowerKey.includes(sk),
      );

      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (value === null || value === undefined) {
        result[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? this.sanitize(item as Record<string, unknown>)
            : item,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Masque un ID pour les logs (garde les premiers/derniers caractères)
   * Exemple: "user_abc123xyz789" → "user_abc...789"
   */
  maskId(id: string, visibleChars = 3): string {
    if (!id || id.length <= visibleChars * 2) return id;
    const start = id.slice(0, visibleChars + (id.includes('_') ? id.indexOf('_') + 1 : 0));
    const end = id.slice(-visibleChars);
    return `${start}...${end}`;
  }

  /**
   * Crée un résumé sécurisé d'un utilisateur pour les logs
   */
  safeUserSummary(userId: string, role?: string): Record<string, string> {
    return {
      userId: this.maskId(userId),
      ...(role && { role }),
    };
  }
}


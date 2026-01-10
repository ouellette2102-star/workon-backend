import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceDocumentType } from '@prisma/client';
import {
  ACTIVE_LEGAL_VERSIONS,
  isVersionActive,
  LegalDocumentType,
} from './compliance.constants';
import { AcceptComplianceDto, ConsentStatusResponseDto } from './dto/accept-compliance.dto';
import { AuditLoggerService } from '../common/audit/audit-logger.service';

/**
 * Compliance Service - Gestion du consentement légal
 *
 * Implémente un système de consentement:
 * - Traçable (qui, quand, quoi, comment)
 * - Audit-proof (IP, userAgent, horodatage)
 * - Versionné (invalidation automatique sur changement de version)
 * - Fail-closed (blocage sans consentement valide)
 *
 * Conformité: Loi 25 Québec, GDPR, Apple App Store, Google Play
 */
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Accepter un document légal
   *
   * @param userId - ID de l'utilisateur authentifié
   * @param dto - Type et version du document
   * @param ipAddress - Adresse IP pour audit
   * @param userAgent - User-Agent pour audit
   * @returns Confirmation d'acceptation
   *
   * @throws BadRequestException si version invalide
   * @throws BadRequestException si déjà accepté (idempotent, mais retourne succès)
   */
  async acceptDocument(
    userId: string,
    dto: AcceptComplianceDto,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const { documentType, version } = dto;

    // Vérifier que la version correspond à la version active
    if (!isVersionActive(documentType as LegalDocumentType, version)) {
      const activeVersion = ACTIVE_LEGAL_VERSIONS[documentType as LegalDocumentType];
      throw new BadRequestException({
        error: 'VERSION_MISMATCH',
        message: `Version invalide. Version active: ${activeVersion}`,
        activeVersion,
        providedVersion: version,
      });
    }

    // Vérifier si déjà accepté avec cette version (idempotence)
    const existing = await this.prisma.complianceDocument.findFirst({
      where: {
        userId,
        type: documentType as ComplianceDocumentType,
        version,
      },
    });

    if (existing) {
      // Idempotent: retourner succès sans erreur
      this.logger.debug(
        `Consentement déjà enregistré: ${userId} - ${documentType} v${version}`,
      );
      return {
        accepted: true,
        documentType,
        version,
        acceptedAt: existing.acceptedAt.toISOString(),
        alreadyAccepted: true,
      };
    }

    // Créer le consentement
    const now = new Date();
    const document = await this.prisma.complianceDocument.create({
      data: {
        id: `consent_${documentType.toLowerCase()}_${userId}_${Date.now()}`,
        userId,
        type: documentType as ComplianceDocumentType,
        version,
        acceptedAt: now,
      },
    });

    this.logger.log(
      `Consentement enregistré: ${userId} - ${documentType} v${version} - IP: ${ipAddress?.substring(0, 15) || 'unknown'}`,
    );

    // Audit log for compliance tracking (PR-I2)
    this.auditLogger.logBusinessEvent(
      AuditLoggerService.EVENTS.CONSENT_ACCEPTED,
      {
        userId: this.auditLogger.maskId(userId),
        documentType,
        version,
        acceptedAt: document.acceptedAt.toISOString(),
      },
    );

    return {
      accepted: true,
      documentType,
      version,
      acceptedAt: document.acceptedAt.toISOString(),
      alreadyAccepted: false,
    };
  }

  /**
   * Vérifier le statut de consentement d'un utilisateur
   *
   * @param userId - ID de l'utilisateur
   * @returns Statut complet du consentement
   */
  async getConsentStatus(userId: string): Promise<ConsentStatusResponseDto> {
    // Récupérer tous les consentements de l'utilisateur
    const consents = await this.prisma.complianceDocument.findMany({
      where: {
        userId,
        type: { in: ['TERMS', 'PRIVACY'] },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    // Construire le statut pour chaque document
    const documents: ConsentStatusResponseDto['documents'] = {};
    const missing: string[] = [];

    for (const docType of ['TERMS', 'PRIVACY'] as const) {
      const activeVersion = ACTIVE_LEGAL_VERSIONS[docType];
      const consent = consents.find(
        (c) => c.type === docType && c.version === activeVersion,
      );

      documents[docType] = {
        accepted: !!consent,
        version: consent?.version || null,
        acceptedAt: consent?.acceptedAt?.toISOString() || null,
        activeVersion,
      };

      if (!consent) {
        missing.push(docType);
      }
    }

    return {
      isComplete: missing.length === 0,
      documents,
      missing,
    };
  }

  /**
   * Vérifier si un utilisateur a un consentement valide pour tous les documents requis
   *
   * @param userId - ID de l'utilisateur
   * @returns true si tous les consentements sont valides
   */
  async hasValidConsent(userId: string): Promise<boolean> {
    const status = await this.getConsentStatus(userId);
    return status.isComplete;
  }

  /**
   * Vérifier le consentement et lever une exception si invalide
   * Utilisé par le ConsentGuard
   *
   * @param userId - ID de l'utilisateur
   * @throws ForbiddenException si consentement manquant
   */
  async requireValidConsent(userId: string): Promise<void> {
    const status = await this.getConsentStatus(userId);

    if (!status.isComplete) {
      // Audit log for consent check failure (PR-I2)
      this.auditLogger.logBusinessWarning(
        AuditLoggerService.EVENTS.CONSENT_CHECK_FAILED,
        'User attempted action without valid consent',
        {
          userId: this.auditLogger.maskId(userId),
          missing: status.missing,
        },
      );

      throw new ForbiddenException({
        error: 'CONSENT_REQUIRED',
        message:
          'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour continuer.',
        missing: status.missing,
        activeVersions: ACTIVE_LEGAL_VERSIONS,
      });
    }
  }

  /**
   * Retourner les versions actives des documents
   * Utile pour le frontend pour vérifier la synchronisation
   */
  getActiveVersions() {
    return {
      versions: ACTIVE_LEGAL_VERSIONS,
      updatedAt: '2026-01-15T00:00:00.000Z', // Date de dernière mise à jour
    };
  }
}


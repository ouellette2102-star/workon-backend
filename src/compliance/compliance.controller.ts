import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplianceService } from './compliance.service';
import { DataRetentionService } from './data-retention.service';
import {
  AcceptComplianceDto,
  AcceptComplianceResponseDto,
  ConsentStatusResponseDto,
} from './dto/accept-compliance.dto';

/**
 * Compliance Controller - Gestion du consentement légal
 *
 * Endpoints pour l'acceptation et la vérification du consentement
 * aux documents légaux (Terms, Privacy Policy).
 *
 * Conformité: Loi 25 Québec, GDPR, Apple App Store, Google Play
 */
@ApiTags('Compliance')
@Controller('api/v1/compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  /**
   * POST /api/v1/compliance/accept
   *
   * Enregistrer l'acceptation d'un document légal.
   * Un document = une acceptation (pas de consentement global).
   *
   * Trace: userId, documentType, version, acceptedAt, IP, userAgent
   */
  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Accepter un document légal',
    description: `
Enregistre l'acceptation explicite d'un document légal (Terms ou Privacy).

**Important:**
- Un document = une acceptation séparée
- La version doit correspondre à la version active
- Idempotent: une double acceptation retourne succès
- Traçabilité: IP et UserAgent enregistrés pour audit

**Loi 25 Québec / GDPR:** Consentement explicite, traçable, horodaté.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Consentement enregistré avec succès',
    type: AcceptComplianceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Version invalide ou données manquantes',
    schema: {
      example: {
        error: 'VERSION_MISMATCH',
        message: 'Version invalide. Version active: 1.0',
        activeVersion: '1.0',
        providedVersion: '0.9',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async acceptDocument(
    @Body() dto: AcceptComplianceDto,
    @Req() req: Request,
  ): Promise<AcceptComplianceResponseDto> {
    const user = req.user as { sub: string };
    const userId = user.sub;

    // Extraire IP et UserAgent pour audit
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    return this.complianceService.acceptDocument(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * GET /api/v1/compliance/status
   *
   * Vérifier le statut de consentement de l'utilisateur connecté.
   * Retourne quels documents sont acceptés et lesquels sont manquants.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Vérifier le statut de consentement',
    description: `
Retourne le statut de consentement pour l'utilisateur connecté.

Inclut:
- isComplete: true si tous les documents requis sont acceptés
- documents: détail de chaque document (accepté, version, date)
- missing: liste des documents non acceptés ou avec version obsolète
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de consentement',
    type: ConsentStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getStatus(@Req() req: Request): Promise<ConsentStatusResponseDto> {
    const user = req.user as { sub: string };
    return this.complianceService.getConsentStatus(user.sub);
  }

  /**
   * GET /api/v1/compliance/versions
   *
   * Retourner les versions actives des documents légaux.
   * Utilisé par le frontend pour vérifier la synchronisation.
   */
  @Get('versions')
  @ApiOperation({
    summary: 'Obtenir les versions actives des documents légaux',
    description: `
Retourne les versions actives des documents légaux.
Le frontend utilise ces versions pour afficher les bons documents
et vérifier si le consentement de l'utilisateur est à jour.

**Public:** Cet endpoint ne nécessite pas d'authentification.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Versions actives',
    schema: {
      example: {
        versions: { TERMS: '1.0', PRIVACY: '1.0' },
        updatedAt: '2026-01-15T00:00:00.000Z',
      },
    },
  })
  getVersions() {
    return this.complianceService.getActiveVersions();
  }

  // ========================================
  // GDPR / Loi 25 — Droits de la personne
  // ========================================

  /**
   * GET /api/v1/compliance/my-data
   * Export all personal data (GDPR Art. 20 / Loi 25)
   */
  @Get('my-data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Exporter mes données personnelles',
    description: 'Retourne toutes les données personnelles de l\'utilisateur (GDPR Art. 20 / Loi 25 Québec).',
  })
  @ApiResponse({ status: 200, description: 'Données exportées' })
  async exportMyData(@Req() req: Request) {
    const user = req.user as { sub: string; userId?: string };
    return this.dataRetentionService.exportUserData(user.userId || user.sub);
  }

  /**
   * POST /api/v1/compliance/delete-account
   * Request account deletion (30-day grace period)
   */
  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Demander la suppression de mon compte',
    description: 'Démarre une période de grâce de 30 jours. Annulable pendant ce délai.',
  })
  @ApiResponse({ status: 200, description: 'Suppression planifiée' })
  async requestAccountDeletion(@Req() req: Request) {
    const user = req.user as { sub: string; userId?: string };
    return this.dataRetentionService.requestDeletion(user.userId || user.sub);
  }

  /**
   * DELETE /api/v1/compliance/delete-account
   * Cancel account deletion request
   */
  @Delete('delete-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Annuler la suppression de mon compte',
    description: 'Annule la demande de suppression si le délai de grâce n\'est pas expiré.',
  })
  @ApiResponse({ status: 200, description: 'Suppression annulée' })
  async cancelAccountDeletion(@Req() req: Request) {
    const user = req.user as { sub: string; userId?: string };
    await this.dataRetentionService.cancelDeletion(user.userId || user.sub);
    return { success: true, message: 'Suppression annulée' };
  }
}


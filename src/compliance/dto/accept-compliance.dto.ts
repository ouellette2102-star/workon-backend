import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ComplianceDocumentType } from '@prisma/client';

/**
 * DTO pour l'acceptation d'un document légal
 *
 * IMPORTANT: Un document = une acceptation
 * Pas de consentement global "tout-en-un"
 */
export class AcceptComplianceDto {
  @ApiProperty({
    enum: ['TERMS', 'PRIVACY'],
    description: 'Type de document légal à accepter',
    example: 'TERMS',
  })
  @IsEnum(['TERMS', 'PRIVACY'], {
    message: 'documentType doit être TERMS ou PRIVACY',
  })
  @IsNotEmpty()
  documentType: 'TERMS' | 'PRIVACY';

  @ApiProperty({
    description: 'Version du document accepté (doit correspondre à la version active)',
    example: '1.0',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+$/, {
    message: 'version doit être au format X.Y (ex: 1.0)',
  })
  version: string;
}

/**
 * Réponse après acceptation réussie
 */
export class AcceptComplianceResponseDto {
  @ApiProperty({ example: true })
  accepted: boolean;

  @ApiProperty({ example: 'TERMS' })
  documentType: string;

  @ApiProperty({ example: '1.0' })
  version: string;

  @ApiProperty({ example: '2026-01-15T12:00:00.000Z' })
  acceptedAt: string;
}

/**
 * DTO pour vérifier le statut de consentement
 */
export class ConsentStatusResponseDto {
  @ApiProperty({
    example: true,
    description: 'True si tous les documents requis sont acceptés avec la version active',
  })
  isComplete: boolean;

  @ApiProperty({
    type: 'object',
    example: {
      TERMS: { accepted: true, version: '1.0', acceptedAt: '2026-01-15T12:00:00.000Z' },
      PRIVACY: { accepted: false, version: null, acceptedAt: null },
    },
  })
  documents: Record<
    string,
    {
      accepted: boolean;
      version: string | null;
      acceptedAt: string | null;
      activeVersion: string;
    }
  >;

  @ApiProperty({
    example: ['PRIVACY'],
    description: 'Liste des documents manquants ou avec version obsolète',
  })
  missing: string[];
}


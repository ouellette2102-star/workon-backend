import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO standardisé pour les erreurs API
 * 
 * Format frontend-safe, utilisé par GlobalHttpExceptionFilter
 */
export class ApiErrorDto {
  @ApiProperty({
    description: 'Code d\'erreur machine-readable',
    example: 'RESOURCE_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'Message d\'erreur human-readable',
    example: 'Resource not found',
  })
  message: string;

  @ApiProperty({
    description: 'Code HTTP',
    example: 404,
  })
  status: number;

  @ApiPropertyOptional({
    description: 'Détails additionnels (validation errors)',
    type: [String],
    example: ['email must be a valid email', 'password must be at least 8 characters'],
  })
  details?: string[];

  @ApiPropertyOptional({
    description: 'ID de corrélation pour le debug',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Timestamp ISO',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp?: string;
}

/**
 * Wrapper pour les erreurs API
 */
export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'Objet erreur',
    type: ApiErrorDto,
  })
  error: ApiErrorDto;
}

/**
 * DTO pour les réponses paginées
 */
export class PaginatedResponseMetaDto {
  @ApiProperty({ description: 'Page actuelle', example: 1 })
  page: number;

  @ApiProperty({ description: 'Éléments par page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Nombre total d\'éléments', example: 150 })
  total: number;

  @ApiProperty({ description: 'Nombre total de pages', example: 8 })
  totalPages: number;

  @ApiProperty({ description: 'Page suivante disponible', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Page précédente disponible', example: false })
  hasPrevious: boolean;
}

/**
 * DTO générique pour les réponses paginées
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Liste des éléments' })
  data: T[];

  @ApiProperty({ description: 'Métadonnées de pagination', type: PaginatedResponseMetaDto })
  meta: PaginatedResponseMetaDto;
}

/**
 * DTO pour les réponses de succès simples
 */
export class SuccessResponseDto {
  @ApiProperty({ description: 'Indicateur de succès', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Message de confirmation', example: 'Operation completed successfully' })
  message?: string;
}

/**
 * DTO pour les réponses de suppression
 */
export class DeleteResponseDto {
  @ApiProperty({ description: 'Indicateur de succès', example: true })
  deleted: boolean;

  @ApiProperty({ description: 'ID de la ressource supprimée', example: 'clx1234567890' })
  id: string;
}


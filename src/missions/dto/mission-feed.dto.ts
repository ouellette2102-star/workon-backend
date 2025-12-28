import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour les filtres du feed de missions (requête)
 */
export class MissionFeedFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtrer par catégorie (slug)',
    example: 'entretien',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par ville',
    example: 'Montréal',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Latitude pour recherche géolocalisée',
    example: 45.5017,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude pour recherche géolocalisée',
    example: -73.5673,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Rayon de recherche en kilomètres',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  maxDistance?: number;
}

/**
 * DTO de réponse pour une mission dans le feed
 */
export class MissionFeedResponseDto {
  @ApiProperty({ description: 'ID unique de la mission', example: 'clx1234567890' })
  id: string;

  @ApiProperty({ description: 'Titre de la mission', example: 'Entretien ménager' })
  title: string;

  @ApiProperty({ description: 'Description de la mission', example: 'Nettoyage complet...', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Catégorie de la mission', example: 'entretien', nullable: true })
  category: string | null;

  @ApiProperty({ description: 'Ville', example: 'Montréal', nullable: true })
  city: string | null;

  @ApiProperty({ description: 'Adresse approximative', example: 'Plateau Mont-Royal', nullable: true })
  address: string | null;

  @ApiProperty({ description: 'Taux horaire (CAD)', example: 25.0, nullable: true })
  hourlyRate: number | null;

  @ApiProperty({ description: 'Date de début (ISO 8601)', example: '2025-02-01T09:00:00.000Z', nullable: true })
  startsAt: string | null;

  @ApiProperty({ description: 'Date de fin (ISO 8601)', example: '2025-02-01T13:00:00.000Z', nullable: true })
  endsAt: string | null;

  @ApiProperty({ description: 'Statut de la mission', example: 'CREATED', enum: ['CREATED', 'RESERVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ description: 'ID de l\'employeur', example: 'clx9876543210' })
  employerId: string;

  @ApiProperty({ description: 'Nom de l\'employeur', example: 'Jean Dupont', nullable: true })
  employerName: string | null;

  @ApiProperty({ description: 'Prix total en cents', example: 10000 })
  priceCents: number;

  @ApiProperty({ description: 'Devise', example: 'CAD', default: 'CAD' })
  currency: string;

  @ApiProperty({ description: 'Distance en km (si géolocalisation)', example: 2.5, nullable: true })
  distance: number | null;

  @ApiProperty({ description: 'Latitude', example: 45.5017, nullable: true })
  latitude: number | null;

  @ApiProperty({ description: 'Longitude', example: -73.5673, nullable: true })
  longitude: number | null;

  @ApiProperty({ description: 'Date de création', example: '2025-01-15T10:00:00.000Z' })
  createdAt: string;
}

/**
 * Interface legacy (pour compatibilité)
 * @deprecated Utiliser MissionFeedResponseDto à la place
 */
export interface MissionFeedResponse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  hourlyRate: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  employerId: string;
  employerName: string | null;
  priceCents: number;
  currency: string;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

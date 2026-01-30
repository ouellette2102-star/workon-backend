import { IsOptional, IsString, IsNumber, IsISO8601, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour la création d'une mission
 * 
 * Utilisé par POST /api/v1/missions
 */
export class CreateMissionDto {
  @ApiProperty({
    description: 'Titre de la mission',
    example: 'Entretien ménager résidentiel',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    description: 'Description détaillée de la mission',
    example: 'Nettoyage complet d\'un appartement 4 1/2. Inclut cuisine, salle de bain, et aspirateur.',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Catégorie de la mission (slug)',
    example: 'entretien',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Ville où se déroule la mission',
    example: 'Montréal',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Adresse approximative (sans numéro exact pour la confidentialité)',
    example: 'Plateau Mont-Royal, Montréal',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude de la mission (coordonnées GPS)',
    example: 45.5231,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude de la mission (coordonnées GPS)',
    example: -73.5812,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Taux horaire proposé (CAD)',
    example: 25.00,
    minimum: 15,
    maximum: 500,
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(500)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Date et heure de début (ISO 8601)',
    example: '2025-02-01T09:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Date et heure de fin (ISO 8601)',
    example: '2025-02-01T13:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  endsAt?: string;
}

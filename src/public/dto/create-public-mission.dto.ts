import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for the public landing-page mission creation endpoint.
 *
 * POST /api/v1/public/missions
 *
 * Accepts a generic mission request from the landing/employer flow,
 * creates an open LocalMission visible in the marketplace, and
 * records client contact info for follow-up.
 */
export class CreatePublicMissionDto {
  @ApiProperty({ example: 'Peinture intérieure 3 pièces' })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  @Length(3, 120)
  title!: string;

  @ApiProperty({ example: 'Repeindre salon, cuisine et corridor. ~400 pi².' })
  @IsString()
  @IsNotEmpty({ message: 'La description est requise' })
  @Length(10, 4000)
  description!: string;

  @ApiProperty({
    example: 'peinture',
    description: 'Category slug (peinture, plomberie, menage, etc.)',
  })
  @IsString()
  @IsNotEmpty({ message: 'La catégorie est requise' })
  @Length(2, 60)
  category!: string;

  @ApiProperty({ example: 'Montréal' })
  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  @Length(2, 80)
  city!: string;

  @ApiProperty({
    example: 500,
    description: 'Estimated budget in CAD (0 = à discuter)',
  })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  budget!: number;

  @ApiProperty({ example: 'Jean Tremblay' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du client est requis' })
  @Length(2, 120)
  clientName!: string;

  @ApiProperty({ example: '+15141234567' })
  @IsString()
  @Matches(/^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, {
    message: 'Numéro de téléphone canadien invalide',
  })
  clientPhone!: string;

  @ApiProperty({ example: 'jean@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Courriel invalide' })
  clientEmail?: string;

  @ApiProperty({ required: false, example: '123 rue Principale' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string;

  @ApiProperty({ required: false, example: 45.5017 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, example: -73.5673 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    required: false,
    example: 'landing_employeurs',
    description: 'Source tracking (landing_public, landing_employeurs, etc.)',
  })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  source?: string;
}

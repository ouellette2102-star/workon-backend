import {
  IsOptional,
  IsString,
  IsNumber,
  IsLatitude,
  IsLongitude,
  IsIn,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+1 514 555 0100',
    description: 'User phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Montréal',
    description: 'User city/region',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 45.5017, description: 'Worker latitude for geolocation' })
  @Type(() => Number)
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -73.5673, description: 'Worker longitude for geolocation' })
  @Type(() => Number)
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'employer',
    description: 'Switch role: worker, employer, or residential_client',
    enum: ['worker', 'employer', 'residential_client'],
  })
  @IsString()
  @IsIn(['worker', 'employer', 'residential_client'])
  @IsOptional()
  role?: string;

  // ── Worker-facing profile fields ──────────────────────────

  @ApiPropertyOptional({ example: 45, description: 'Hourly rate in CAD (worker)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 'Paysagiste résidentiel', description: 'Short public title under the name' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ example: '10 ans d\'expérience en aménagement paysager résidentiel', description: 'Public bio' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'paysagement', description: 'Primary service category slug' })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 25, description: 'Service radius in km' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  @IsOptional()
  serviceRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Replace portfolio photo URLs (gallery). Max 12 URLs.',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(12)
  @IsUrl({}, { each: true })
  @IsOptional()
  gallery?: string[];

  // ── Employer-facing onboarding fields (T44) ───────────────────

  @ApiPropertyOptional({
    example: 'Nettoyage Pro Montréal Inc.',
    description: 'Company or sole-prop business name (employers)',
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({
    example: 'nettoyage-commercial',
    description: 'Primary business category slug',
  })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  businessCategory?: string;

  @ApiPropertyOptional({
    example:
      'Agence de nettoyage commercial établie à Repentigny, 12 clients B2B récurrents.',
    description: 'Public-facing business description',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({
    example: 'https://nettoyagepro.ca',
    description: 'Business website URL',
  })
  @IsUrl()
  @MaxLength(200)
  @IsOptional()
  businessWebsite?: string;
}


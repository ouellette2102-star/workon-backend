import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceRule } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Nettoyage hebdomadaire' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Nettoyage complet de la maison chaque semaine' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'cat_cleaning_001' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'fixed' })
  @IsString()
  priceType: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 120, description: 'Duration in minutes' })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({ enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'], example: 'WEEKLY' })
  @IsEnum(RecurrenceRule)
  recurrenceRule: RecurrenceRule;

  @ApiPropertyOptional({ description: 'Custom recurrence data (JSON)' })
  @IsOptional()
  recurrenceData?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 52 })
  @IsNumber()
  @IsOptional()
  maxOccurrences?: number;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2027-04-15' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ example: 45.5017, description: 'Default latitude for generated missions' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -73.5673, description: 'Default longitude for generated missions' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Montréal', description: 'Default city for generated missions' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '1234 Rue Saint-Denis' })
  @IsString()
  @IsOptional()
  address?: string;
}

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
}

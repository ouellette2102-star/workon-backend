import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetMissionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'all'],
    default: 'open',
  })
  @IsOptional()
  @IsIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'all'])
  status?: string = 'open';

  @ApiPropertyOptional({
    description: 'Filter by category name',
    example: 'Entretien',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Montréal',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Center latitude for geo search',
    example: 45.5017,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Center longitude for geo search',
    example: -73.5673,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Radius in km (requires lat/lng)',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number = 10;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    default: 100,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}


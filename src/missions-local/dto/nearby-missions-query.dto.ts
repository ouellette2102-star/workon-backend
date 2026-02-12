import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NearbyMissionsQueryDto {
  @ApiPropertyOptional({
    example: 45.5017,
    description: 'Current latitude',
  })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiPropertyOptional({
    example: -73.5673,
    description: 'Current longitude',
  })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Search radius in kilometers',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  radiusKm?: number = 10;

  @ApiPropertyOptional({
    example: 'proximity',
    description: 'Sort order: proximity (default), date, price',
    enum: ['proximity', 'date', 'price'],
  })
  @IsString()
  @IsIn(['proximity', 'date', 'price'])
  @IsOptional()
  sort?: 'proximity' | 'date' | 'price';

  @ApiPropertyOptional({
    example: 'Entretien',
    description: 'Filter by category name',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    example: 'plomberie',
    description: 'Search query for title/description',
  })
  @IsString()
  @IsOptional()
  query?: string;
}


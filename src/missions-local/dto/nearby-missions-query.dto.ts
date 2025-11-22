import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
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
}


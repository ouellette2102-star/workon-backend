import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for GET /missions/map endpoint
 * 
 * Validates bounding box parameters for map-based mission search.
 * Uses bbox (north/south/east/west) which is more efficient than radius for maps.
 */
export class MissionsMapQueryDto {
  @ApiProperty({
    description: 'Northern boundary latitude',
    example: 45.55,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  north: number;

  @ApiProperty({
    description: 'Southern boundary latitude',
    example: 45.45,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  south: number;

  @ApiProperty({
    description: 'Eastern boundary longitude',
    example: -73.5,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  east: number;

  @ApiProperty({
    description: 'Western boundary longitude',
    example: -73.7,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  west: number;

  @ApiPropertyOptional({
    description: 'Filter by mission status (default: open)',
    example: 'open',
    enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  status?: string = 'open';

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'plumbing',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results (default: 200, max: 500)',
    example: 200,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 200;
}


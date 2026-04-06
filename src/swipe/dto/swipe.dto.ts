import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SwipeActionDto {
  @ApiProperty({ example: 'lu_worker_123', description: 'Candidate user ID' })
  @IsString()
  candidateId: string;

  @ApiProperty({ enum: ['LIKE', 'PASS', 'SUPERLIKE'], example: 'LIKE' })
  @IsEnum(['LIKE', 'PASS', 'SUPERLIKE'])
  action: 'LIKE' | 'PASS' | 'SUPERLIKE';
}

export class SwipeCandidatesQueryDto {
  @ApiPropertyOptional({ example: 'worker', description: 'Filter by role' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: 'plumbing', description: 'Filter by category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 45.5017 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: -73.5673 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 25, description: 'Radius in km' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  radiusKm?: number;

  @ApiPropertyOptional({ example: 4, description: 'Minimum rating (1-5)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  minRating?: number;
}

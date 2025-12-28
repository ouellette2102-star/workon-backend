import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetSkillsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category name (exact match, FR)',
    example: 'Entretien',
  })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({
    description: 'Filter by requiresPermit flag',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  requiresPermit?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by proofType (exact match)',
    example: 'Licence RBQ',
  })
  @IsOptional()
  @IsString()
  proofType?: string;

  @ApiPropertyOptional({
    description: 'Search query (case-insensitive on name + nameEn)',
    example: 'plomberie',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'nameEn', 'createdAt'],
    default: 'name',
  })
  @IsOptional()
  @IsIn(['name', 'nameEn', 'createdAt'])
  sort?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}


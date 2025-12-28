import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class GetCategoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by residential allowed status',
    enum: ['true', 'false', 'all'],
    default: 'all',
    example: 'all',
  })
  @IsOptional()
  @IsIn(['true', 'false', 'all'])
  includeResidential?: string = 'all';
}


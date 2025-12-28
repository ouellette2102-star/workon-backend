import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Category response DTO
 */
export class CategoryResponseDto {
  @ApiProperty({ example: 'cat_123456789_abc' })
  id: string;

  @ApiProperty({ example: 'Entretien' })
  name: string;

  @ApiPropertyOptional({ example: 'Cleaning' })
  nameEn: string | null;

  @ApiPropertyOptional({ example: '🧼' })
  icon: string | null;

  @ApiPropertyOptional({ example: null })
  legalNotes: string | null;

  @ApiProperty({ example: true })
  residentialAllowed: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

/**
 * Category summary (embedded in skill response)
 */
export class CategorySummaryDto {
  @ApiProperty({ example: 'cat_123456789_abc' })
  id: string;

  @ApiProperty({ example: 'Entretien' })
  name: string;

  @ApiPropertyOptional({ example: 'Cleaning' })
  nameEn: string | null;

  @ApiPropertyOptional({ example: '🧼' })
  icon: string | null;

  @ApiProperty({ example: true })
  residentialAllowed: boolean;
}

/**
 * Skill response DTO
 */
export class SkillResponseDto {
  @ApiProperty({ example: 'skill_123456789_abc' })
  id: string;

  @ApiProperty({ example: 'Entretien ménager résidentiel' })
  name: string;

  @ApiPropertyOptional({ example: 'Residential Cleaning' })
  nameEn: string | null;

  @ApiProperty({ example: 'cat_123456789_abc' })
  categoryId: string;

  @ApiProperty({ example: false })
  requiresPermit: boolean;

  @ApiPropertyOptional({ example: null })
  proofType: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Category details (included in response)',
    type: () => CategorySummaryDto,
  })
  category?: CategorySummaryDto;
}

/**
 * Pagination meta DTO
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  pageSize: number;

  @ApiProperty({ example: 90 })
  total: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

/**
 * Paginated skills response
 */
export class PaginatedSkillsResponseDto {
  @ApiProperty({ type: [SkillResponseDto] })
  data: SkillResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * Catalog health response
 */
export class CatalogHealthResponseDto {
  @ApiProperty({ example: 10 })
  categoriesCount: number;

  @ApiProperty({ example: 90 })
  skillsCount: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

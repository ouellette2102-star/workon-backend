import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Category response DTO - represents a top-level job domain
 * Categories are legally locked and define the main work areas in WorkOn
 */
export class CategoryResponseDto {
  @ApiProperty({
    description: 'Unique category identifier',
    example: 'cat_123456789_abc',
  })
  id: string;

  @ApiProperty({
    description: 'Category name in French (official)',
    example: 'Entretien',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category name in English (for i18n)',
    example: 'Cleaning',
    nullable: true,
  })
  nameEn: string | null;

  @ApiPropertyOptional({
    description: 'Emoji icon for UI display',
    example: '🧼',
    nullable: true,
  })
  icon: string | null;

  @ApiPropertyOptional({
    description: 'Legal notes or restrictions for this category (Quebec regulations)',
    example: 'Certains services peuvent exiger permis/licence',
    nullable: true,
  })
  legalNotes: string | null;

  @ApiProperty({
    description: 'Whether residential clients can request services in this category',
    example: true,
  })
  residentialAllowed: boolean;

  @ApiProperty({
    description: 'Category creation timestamp (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * Category summary - lightweight version embedded in skill responses
 */
export class CategorySummaryDto {
  @ApiProperty({
    description: 'Unique category identifier',
    example: 'cat_123456789_abc',
  })
  id: string;

  @ApiProperty({
    description: 'Category name in French',
    example: 'Entretien',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category name in English',
    example: 'Cleaning',
    nullable: true,
  })
  nameEn: string | null;

  @ApiPropertyOptional({
    description: 'Emoji icon for UI display',
    example: '🧼',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: 'Whether residential clients can request services in this category',
    example: true,
  })
  residentialAllowed: boolean;
}

/**
 * Skill response DTO - represents a specific job/profession
 * Skills are legally locked and belong to categories
 */
export class SkillResponseDto {
  @ApiProperty({
    description: 'Unique skill identifier',
    example: 'skill_123456789_abc',
  })
  id: string;

  @ApiProperty({
    description: 'Skill name in French (official)',
    example: 'Entretien ménager résidentiel',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Skill name in English (for i18n)',
    example: 'Residential Cleaning',
    nullable: true,
  })
  nameEn: string | null;

  @ApiProperty({
    description: 'Parent category identifier (foreign key)',
    example: 'cat_123456789_abc',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Whether this skill requires an official permit/license (e.g., RBQ)',
    example: false,
  })
  requiresPermit: boolean;

  @ApiPropertyOptional({
    description: 'Type of proof required if requiresPermit is true (e.g., "Licence RBQ", "DEP", "MAPAQ")',
    example: null,
    nullable: true,
  })
  proofType: string | null;

  @ApiProperty({
    description: 'Skill creation timestamp (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Embedded parent category details (always included)',
    type: () => CategorySummaryDto,
  })
  category?: CategorySummaryDto;
}

/**
 * Pagination metadata for list responses
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of items matching the query',
    example: 90,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages available',
    example: 2,
  })
  totalPages: number;
}

/**
 * Paginated skills response - wrapper for skill list with pagination
 */
export class PaginatedSkillsResponseDto {
  @ApiProperty({
    description: 'Array of skills for the current page',
    type: [SkillResponseDto],
  })
  data: SkillResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

/**
 * Catalog health response - monitoring endpoint data
 */
export class CatalogHealthResponseDto {
  @ApiProperty({
    description: 'Total number of categories in the database (expected: 10)',
    example: 10,
  })
  categoriesCount: number;

  @ApiProperty({
    description: 'Total number of skills in the database (expected: 90)',
    example: 90,
  })
  skillsCount: number;

  @ApiProperty({
    description: 'Timestamp of this health check (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}

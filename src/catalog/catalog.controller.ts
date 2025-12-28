import { Controller, Get, Query, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { GetCategoriesQueryDto } from './dto/get-categories.query.dto';
import { GetSkillsQueryDto } from './dto/get-skills.query.dto';
import {
  CategoryResponseDto,
  PaginatedSkillsResponseDto,
  CatalogHealthResponseDto,
} from './dto/catalog.responses';

@ApiTags('Catalog')
@Controller('api/v1/catalog')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Get all categories
   */
  @Get('categories')
  @ApiOperation({
    summary: 'List all job categories',
    description:
      'Returns the complete list of WorkOn job categories (10 categories). ' +
      'Categories are the top-level classification for skills/jobs. ' +
      'Use `includeResidential` to filter categories allowed for residential clients. ' +
      'Each category includes: id, name (FR), nameEn, icon emoji, legalNotes, residentialAllowed. ' +
      '**Public endpoint - no authentication required. Data is legally locked.**',
  })
  @ApiQuery({
    name: 'includeResidential',
    required: false,
    enum: ['true', 'false', 'all'],
    description:
      'Filter categories by residential client eligibility. ' +
      '"true" = only residential-allowed, "false" = only commercial, "all" = no filter.',
    example: 'all',
  })
  @ApiOkResponse({
    description: 'Array of job categories sorted alphabetically by name',
    type: [CategoryResponseDto],
  })
  async getCategories(
    @Query() query: GetCategoriesQueryDto,
  ): Promise<CategoryResponseDto[]> {
    this.logger.log(`GET /catalog/categories - filter: ${query.includeResidential}`);
    return this.catalogService.getCategories(query);
  }

  /**
   * Get skills with filtering and pagination
   */
  @Get('skills')
  @ApiOperation({
    summary: 'List skills with filtering and pagination',
    description:
      'Returns the paginated list of WorkOn skills/jobs (90 skills total). ' +
      'Skills are specific job types within categories (e.g., "Residential Cleaning" in "Entretien"). ' +
      'Each skill includes: id, name (FR), nameEn, categoryId, requiresPermit, proofType. ' +
      'Skills with `requiresPermit: true` require workers to provide proof (e.g., RBQ license). ' +
      'Use filters to narrow down results for category pickers or search autocomplete. ' +
      '**Public endpoint - no authentication required. Data is legally locked.**',
  })
  @ApiQuery({
    name: 'categoryName',
    required: false,
    description: 'Filter by category name in French (exact match). Use GET /categories to get valid names.',
    example: 'Entretien',
  })
  @ApiQuery({
    name: 'requiresPermit',
    required: false,
    type: Boolean,
    description: 'Filter skills requiring official permits/licenses (true/false)',
  })
  @ApiQuery({
    name: 'proofType',
    required: false,
    description: 'Filter by exact proof type required (e.g., "Licence RBQ", "DEP", "MAPAQ")',
    example: 'Licence RBQ',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Free-text search on skill name (FR) and nameEn. Case-insensitive, partial match.',
    example: 'plomberie',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based). Default: 1',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Number of items per page. Default: 50, Max: 100',
    example: 50,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['name', 'nameEn', 'createdAt'],
    description: 'Field to sort by. Default: name',
    example: 'name',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order. Default: asc',
    example: 'asc',
  })
  @ApiOkResponse({
    description: 'Paginated list of skills with metadata (page, total, totalPages)',
    type: PaginatedSkillsResponseDto,
  })
  async getSkills(
    @Query() query: GetSkillsQueryDto,
  ): Promise<PaginatedSkillsResponseDto> {
    this.logger.log(
      `GET /catalog/skills - filters: ${JSON.stringify(query)}`,
    );
    return this.catalogService.getSkills(query);
  }

  /**
   * Get catalog health status
   */
  @Get('health')
  @ApiOperation({
    summary: 'Catalog service health check',
    description:
      'Returns aggregated counts for monitoring and dashboard display. ' +
      'Expected values: 10 categories, 90 skills. ' +
      'Use this endpoint to verify catalog data integrity after deployments. ' +
      '**Public endpoint - no authentication required.**',
  })
  @ApiOkResponse({
    description: 'Health status with category and skill counts',
    type: CatalogHealthResponseDto,
  })
  async getHealth(): Promise<CatalogHealthResponseDto> {
    this.logger.log('GET /catalog/health');
    return this.catalogService.getHealth();
  }
}

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

@ApiTags('catalog')
@Controller('api/v1/catalog')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Get all categories
   */
  @Get('categories')
  @ApiOperation({
    summary: 'Get all job categories',
    description:
      'Returns all job categories with optional filtering by residential status. ' +
      'Categories define the main domains of work (e.g., Cleaning, Construction, Beauty).',
  })
  @ApiQuery({
    name: 'includeResidential',
    required: false,
    enum: ['true', 'false', 'all'],
    description: 'Filter by residential allowed status',
    example: 'all',
  })
  @ApiOkResponse({
    description: 'List of categories',
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
    summary: 'Get skills with filtering and pagination',
    description:
      'Returns paginated list of skills (jobs/professions) with optional filtering. ' +
      'Skills belong to categories and may require permits or certifications.',
  })
  @ApiQuery({
    name: 'categoryName',
    required: false,
    description: 'Filter by category name (exact match, FR)',
    example: 'Entretien',
  })
  @ApiQuery({
    name: 'requiresPermit',
    required: false,
    type: Boolean,
    description: 'Filter by permit requirement',
  })
  @ApiQuery({
    name: 'proofType',
    required: false,
    description: 'Filter by proof type (exact match)',
    example: 'Licence RBQ',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query (case-insensitive on name + nameEn)',
    example: 'plomberie',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['name', 'nameEn', 'createdAt'],
    description: 'Sort field',
    example: 'name',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'asc',
  })
  @ApiOkResponse({
    description: 'Paginated list of skills',
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
    summary: 'Get catalog health status',
    description:
      'Returns the count of categories and skills in the database. ' +
      'Useful for monitoring and verifying catalog data integrity.',
  })
  @ApiOkResponse({
    description: 'Catalog health status',
    type: CatalogHealthResponseDto,
  })
  async getHealth(): Promise<CatalogHealthResponseDto> {
    this.logger.log('GET /catalog/health');
    return this.catalogService.getHealth();
  }
}

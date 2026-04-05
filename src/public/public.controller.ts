import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('api/v1/public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(private readonly publicService: PublicService) {}

  /**
   * GET /api/v1/public/stats
   * Platform-wide statistics for the homepage.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description:
      'Returns aggregate platform stats: active workers, completed missions, ' +
      'open missions, sector count, active cities, and average rating.',
  })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  async getStats() {
    this.logger.log('Fetching platform stats');
    return this.publicService.getStats();
  }

  /**
   * GET /api/v1/public/workers/featured?limit=9
   * Featured workers for the homepage carousel.
   */
  @Get('workers/featured')
  @ApiOperation({
    summary: 'Get featured workers',
    description:
      'Returns top workers ordered by completion score. ' +
      'Used by the homepage to display featured professionals.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 9 })
  @ApiResponse({ status: 200, description: 'Array of featured workers' })
  async getFeaturedWorkers(@Query('limit') limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || '9', 10) || 9, 1), 50);
    this.logger.log(`Fetching featured workers (limit=${parsedLimit})`);
    return this.publicService.getFeaturedWorkers(parsedLimit);
  }

  /**
   * GET /api/v1/public/workers/:slug
   * Full public profile for a worker by URL slug.
   */
  @Get('workers/:slug')
  @ApiOperation({
    summary: 'Get worker public profile by slug',
    description:
      'Returns the full public profile of a worker by their URL slug. ' +
      'Used by the Next.js frontend to render /pro/{slug} pages.',
  })
  @ApiParam({ name: 'slug', example: 'marc-dubois-montreal' })
  @ApiResponse({ status: 200, description: 'Worker public profile' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorkerBySlug(@Param('slug') slug: string) {
    this.logger.log(`Fetching worker profile: ${slug}`);
    return this.publicService.getWorkerBySlug(slug);
  }

  /**
   * GET /api/v1/public/reviews/featured?limit=6
   * Featured reviews for the homepage.
   */
  @Get('reviews/featured')
  @ApiOperation({
    summary: 'Get featured reviews',
    description:
      'Returns recent approved reviews for display on the homepage.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  @ApiResponse({ status: 200, description: 'Array of featured reviews' })
  async getFeaturedReviews(@Query('limit') limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || '6', 10) || 6, 1), 50);
    this.logger.log(`Fetching featured reviews (limit=${parsedLimit})`);
    return this.publicService.getFeaturedReviews(parsedLimit);
  }

  /**
   * GET /api/v1/public/missions?category=X&city=X&page=1&limit=10
   * Public missions feed with filtering and pagination.
   */
  @Get('missions')
  @ApiOperation({
    summary: 'Get public missions',
    description:
      'Returns open missions with optional category/city filtering and pagination.',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated missions list' })
  async getPublicMissions(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(parseInt(page || '1', 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 100);
    this.logger.log(
      `Fetching public missions (category=${category}, city=${city}, page=${parsedPage}, limit=${parsedLimit})`,
    );
    return this.publicService.getPublicMissions({
      category,
      city,
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  /**
   * GET /api/v1/public/sectors/stats
   * Sector statistics for the sectors page.
   */
  @Get('sectors/stats')
  @ApiOperation({
    summary: 'Get sector statistics',
    description:
      'Returns mission and worker counts grouped by category/sector.',
  })
  @ApiResponse({ status: 200, description: 'Array of sector stats' })
  async getSectorStats() {
    this.logger.log('Fetching sector stats');
    return this.publicService.getSectorStats();
  }
}

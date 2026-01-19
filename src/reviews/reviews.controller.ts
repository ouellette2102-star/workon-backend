import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  ReviewResponseDto,
  RatingSummaryDto,
} from './dto/review-response.dto';

/**
 * Reviews Controller - Gestion des avis et évaluations
 *
 * Endpoints pour créer, consulter et récupérer les avis
 * laissés par les utilisateurs après une mission.
 *
 * Note: Ce controller utilise le path /reviews (sans préfixe api/v1)
 * pour compatibilité avec les clients existants.
 */
@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /reviews/summary?userId=...
   * Returns rating summary for a user.
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get rating summary for a user',
    description:
      'Returns aggregated rating statistics for a user: average rating, ' +
      'total number of reviews, and rating distribution (1-5 stars).',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'Target user ID to get rating summary for',
    example: 'user_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Rating summary retrieved successfully',
    type: RatingSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getSummary(@Query('userId') userId: string): Promise<RatingSummaryDto> {
    return this.reviewsService.getSummaryForUser(userId);
  }

  /**
   * GET /reviews?userId=...
   * Returns list of reviews for a user.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get reviews for a user',
    description:
      'Returns paginated list of reviews received by a user. ' +
      'Ordered by most recent first.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'Target user ID to get reviews for',
    example: 'user_abc123',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of reviews to return (default: 20)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of reviews to skip for pagination',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of reviews',
    type: [ReviewResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getReviews(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getReviewsForUser(
      userId,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  /**
   * POST /reviews
   * Creates a new review.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create a review',
    description:
      'Submit a review for another user after a completed mission. ' +
      'Only one review per mission per reviewer is allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid review data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 409, description: 'Review already exists for this mission' })
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(req.user.userId, dto);
  }

  /**
   * GET /reviews/:id
   * Gets a single review by ID.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get a review by ID',
    description: 'Returns details of a specific review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review details',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id') id: string): Promise<ReviewResponseDto> {
    return this.reviewsService.findOne(id);
  }
}


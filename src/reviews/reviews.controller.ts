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

@ApiTags('Reviews')
@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /reviews/summary?userId=...
   * Returns rating summary for a user.
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rating summary for a user' })
  @ApiQuery({ name: 'userId', required: true, description: 'Target user ID' })
  @ApiResponse({ status: 200, type: RatingSummaryDto })
  async getSummary(@Query('userId') userId: string): Promise<RatingSummaryDto> {
    return this.reviewsService.getSummaryForUser(userId);
  }

  /**
   * GET /reviews?userId=...
   * Returns list of reviews for a user.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews for a user' })
  @ApiQuery({ name: 'userId', required: true, description: 'Target user ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Skip results' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  @ApiResponse({ status: 409, description: 'Review already exists' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id') id: string): Promise<ReviewResponseDto> {
    return this.reviewsService.findOne(id);
  }
}


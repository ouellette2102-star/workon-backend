import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  createReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.reviewsService.createReview(userId, dto);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get reviews for a user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  getReviews(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviewsService.getReviewsForUser(
      userId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get('reviews/summary')
  @ApiOperation({ summary: 'Get rating summary for a user' })
  @ApiQuery({ name: 'userId', required: true })
  getSummary(@Query('userId') userId: string) {
    return this.reviewsService.getSummaryForUser(userId);
  }

  @Get('me/reviews')
  @ApiOperation({ summary: 'Get reviews for current user' })
  getMyReviews(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.reviewsService.getReviewsForUser(
      userId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get('me/reviews/summary')
  @ApiOperation({ summary: 'Get rating summary for current user' })
  getMySummary(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.reviewsService.getSummaryForUser(userId);
  }
}


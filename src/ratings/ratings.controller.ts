import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingResponseDto, UserRatingsResponseDto } from './dto/rating-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Ratings')
@Controller('api/v1/ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /**
   * POST /api/v1/ratings
   * Create a new rating for a completed mission
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a rating for a completed mission' })
  @ApiResponse({
    status: 201,
    description: 'Rating created successfully',
    type: RatingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input (self-rating, invalid target)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (mission not completed, not involved)' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 409, description: 'Rating already exists for this mission' })
  async create(
    @Request() req: any,
    @Body() createRatingDto: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    return this.ratingsService.create(req.user.sub, createRatingDto);
  }

  /**
   * GET /api/v1/ratings/me
   * Get ratings received by the current user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ratings received by the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of ratings received',
    type: UserRatingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRatings(@Request() req: any): Promise<UserRatingsResponseDto> {
    return this.ratingsService.findMyRatings(req.user.sub);
  }

  /**
   * GET /api/v1/ratings/user/:id
   * Get ratings received by a specific user (public)
   */
  @Get('user/:id')
  @ApiOperation({ summary: 'Get ratings received by a specific user (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of ratings received by the user',
    type: UserRatingsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getByUser(@Param('id') userId: string): Promise<UserRatingsResponseDto> {
    return this.ratingsService.findByUser(userId);
  }
}


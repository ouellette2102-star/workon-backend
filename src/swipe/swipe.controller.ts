import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SwipeService } from './swipe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SwipeActionDto, SwipeCandidatesQueryDto } from './dto/swipe.dto';
import { CreateMissionFromMatchDto } from './dto/create-mission-from-match.dto';

/**
 * Swipe Discovery Controller
 *
 * MAP = find work (missions/opportunities)
 * SWIPE = find talent (workers/companies)
 *
 * This controller handles candidate discovery and matching.
 */
@ApiTags('Swipe Discovery')
@Controller('api/v1/swipe')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SwipeController {
  constructor(private readonly swipeService: SwipeService) {}

  @Get('candidates')
  @ApiOperation({
    summary: 'Get swipe candidates',
    description: 'Returns workers/companies for swiping. Excludes already-swiped users.',
  })
  @ApiResponse({ status: 200, description: 'Candidates list' })
  async getCandidates(@Request() req: any, @Query() query: SwipeCandidatesQueryDto) {
    try {
      return await this.swipeService.getCandidates(req.user.sub, {
        role: query.role,
        category: query.category,
        lat: query.lat,
        lng: query.lng,
        radiusKm: query.radiusKm,
        minRating: query.minRating,
      });
    } catch (error) {
      // Expose actual error for debugging — remove after stabilization
      throw new Error(`Swipe candidates error: ${(error as Error).message}`);
    }
  }

  @Post('action')
  @ApiOperation({
    summary: 'Record a swipe action',
    description: 'LIKE, PASS, or SUPERLIKE a candidate. If mutual LIKE, creates a match.',
  })
  @ApiResponse({ status: 201, description: 'Swipe recorded' })
  async swipe(@Request() req: any, @Body() dto: SwipeActionDto) {
    return this.swipeService.recordSwipe(req.user.sub, dto.candidateId, dto.action);
  }

  @Get('matches')
  @ApiOperation({
    summary: 'Get my matches',
    description: 'Returns all active mutual matches.',
  })
  @ApiResponse({ status: 200, description: 'Matches list' })
  async getMatches(@Request() req: any) {
    return this.swipeService.getMatches(req.user.sub);
  }

  @Post('matches/mission')
  @ApiOperation({
    summary: 'Create a mission from a match',
    description: 'Creates an assigned LocalMission from a swipe match. The matched user becomes the worker.',
  })
  @ApiResponse({ status: 201, description: 'Mission created from match' })
  async createMissionFromMatch(@Request() req: any, @Body() dto: CreateMissionFromMatchDto) {
    return this.swipeService.createMissionFromMatch(req.user.sub, dto.matchId, {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      price: dto.price,
    });
  }
}

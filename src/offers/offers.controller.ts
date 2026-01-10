import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentGuard, RequireConsent } from '../compliance/guards/consent.guard';

/**
 * Offers Controller - Gestion des offres de mission
 *
 * PROTECTION LÉGALE: Tous les endpoints d'offres sont protégés par @RequireConsent.
 * Un utilisateur DOIT avoir accepté les Terms et Privacy Policy avant de pouvoir
 * créer, consulter ou accepter des offres.
 *
 * Conformité: Loi 25 Québec, GDPR, Apple App Store, Google Play
 */
@ApiTags('Offers')
@Controller('api/v1/offers')
@UseGuards(JwtAuthGuard, ConsentGuard)
@ApiBearerAuth()
@RequireConsent() // PROTECTION LÉGALE - Fail-closed sur tous les endpoints offres
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  /**
   * POST /api/v1/offers
   * Create a new offer for a mission
   */
  @Post()
  @ApiOperation({
    summary: 'Create an offer',
    description:
      'Submit an offer for a mission. Workers can only make one offer per mission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Offer created successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Mission not open or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required or cannot offer on your own mission' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 409, description: 'Already made an offer on this mission' })
  async create(
    @Request() req: { user: { sub: string } },
    @Body() createOfferDto: CreateOfferDto,
  ): Promise<OfferResponseDto> {
    return this.offersService.create(req.user.sub, createOfferDto);
  }

  /**
   * GET /api/v1/offers/mission/:missionId
   * Get all offers for a mission
   */
  @Get('mission/:missionId')
  @ApiOperation({
    summary: 'Get offers for a mission',
    description: 'Returns all offers for a specific mission, ordered by creation date (newest first).',
  })
  @ApiParam({
    name: 'missionId',
    description: 'Mission ID',
    example: 'local_1234567890_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of offers',
    type: [OfferResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required - user must accept Terms and Privacy' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async findByMission(
    @Request() req: { user: { sub: string } },
    @Param('missionId') missionId: string,
  ): Promise<OfferResponseDto[]> {
    return this.offersService.findByMission(missionId, req.user.sub);
  }

  /**
   * PATCH /api/v1/offers/:id/accept
   * Accept an offer (mission owner only)
   */
  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an offer',
    description:
      'Accept an offer for your mission. This will decline all other pending offers ' +
      'and assign the worker to the mission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Offer ID',
    example: 'offer_1234567890_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer accepted successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Offer already accepted or mission closed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required or only mission owner can accept offers' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async accept(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ): Promise<OfferResponseDto> {
    return this.offersService.accept(id, req.user.sub);
  }

  /**
   * PR-S5: GET /api/v1/offers/mine
   * Get all offers made by the current user (my applications)
   */
  @Get('mine')
  @ApiOperation({
    summary: 'Get my offers/applications',
    description: 'Returns all offers made by the current user, with mission details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user offers with mission details',
    type: [OfferResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required' })
  async findMine(
    @Request() req: { user: { sub: string } },
  ): Promise<OfferResponseDto[]> {
    return this.offersService.findByWorker(req.user.sub);
  }

  /**
   * PR-S5: PATCH /api/v1/offers/:id/reject
   * Reject an offer (mission owner only)
   */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject an offer',
    description: 'Reject an offer for your mission. Only pending offers can be rejected.',
  })
  @ApiParam({
    name: 'id',
    description: 'Offer ID',
    example: 'offer_1234567890_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer rejected successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Offer not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required or only mission owner can reject' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async reject(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ): Promise<OfferResponseDto> {
    return this.offersService.reject(id, req.user.sub);
  }

  /**
   * GET /api/v1/offers/:id
   * Get a single offer by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get offer by ID',
    description: 'Returns details of a specific offer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Offer ID',
    example: 'offer_1234567890_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer details',
    type: OfferResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Consent required - user must accept Terms and Privacy' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async findById(@Param('id') id: string): Promise<OfferResponseDto> {
    return this.offersService.findById(id);
  }
}


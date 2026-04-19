import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Headers,
  Req,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoostsService } from './boosts.service';
import { BoostType } from '@prisma/client';
import {
  CreateMissionBoostDto,
  CreateAccountBoostDto,
} from './dto/create-boost.dto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

@ApiTags('Boosts')
@Controller('api/v1/boosts')
export class BoostsController {
  constructor(private readonly boosts: BoostsService) {}

  @Post('mission-urgent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: '$9 — flag mission as urgent 24h, push to nearby pros',
  })
  @ApiResponse({ status: 200, description: 'PaymentIntent clientSecret returned' })
  async missionUrgent(
    @Request() req: { user: { sub: string } },
    @Body() _dto: CreateMissionBoostDto,
  ) {
    // Push notification infrastructure (Firebase) not yet configured in prod.
    // Charging users for a service we cannot deliver would be fraudulent.
    // Re-enable once Firebase FCM is wired up.
    throw new ServiceUnavailableException(
      'Cette fonctionnalité est temporairement indisponible. Réessayez plus tard.',
    );
  }

  @Post('top-visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: '$14 — top of map/swipe stack for 48h',
  })
  @ApiResponse({ status: 200, description: 'PaymentIntent clientSecret returned' })
  async topVisibility(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateMissionBoostDto,
  ) {
    return this.boosts.createBoost(
      req.user.sub,
      BoostType.TOP_48H_14,
      dto.missionId,
    );
  }

  @Post('verify-express')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: '$19 — ID verification reviewed within 24h',
  })
  @ApiResponse({ status: 200, description: 'PaymentIntent clientSecret returned' })
  async verifyExpress(
    @Request() _req: { user: { sub: string } },
    @Body() _dto: CreateAccountBoostDto,
  ) {
    // Reviewer queue and admin UI not yet built.
    // Charging users with no fulfillment path would be fraudulent.
    // Re-enable once identity review queue is implemented.
    throw new ServiceUnavailableException(
      'Cette fonctionnalité est temporairement indisponible. Réessayez plus tard.',
    );
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my boosts (history)' })
  async listMine(@Request() req: { user: { sub: string } }) {
    return this.boosts.listMine(req.user.sub);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook — payment_intent.* events' })
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!req.rawBody) {
      throw new BadRequestException('Raw body missing');
    }
    const event = this.boosts.verifyWebhook(req.rawBody, signature);
    return this.boosts.handleWebhook(event);
  }
}

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
    @Body() dto: CreateMissionBoostDto,
  ) {
    return this.boosts.createBoost(req.user.sub, BoostType.URGENT_9, dto.missionId);
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
    @Request() req: { user: { sub: string } },
    @Body() _dto: CreateAccountBoostDto,
  ) {
    return this.boosts.createBoost(req.user.sub, BoostType.VERIFY_EXPRESS_19);
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

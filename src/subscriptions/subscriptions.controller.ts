import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Req,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

@ApiTags('Subscriptions')
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my current subscription' })
  @ApiResponse({ status: 200 })
  async getMine(@Request() req: { user: { sub: string } }) {
    return this.subscriptions.getMySubscription(req.user.sub);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout URL returned' })
  async createCheckout(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subscriptions.createCheckout(req.user.sub, dto.plan, {
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'No active subscription' })
  async cancel(@Request() req: { user: { sub: string } }) {
    return this.subscriptions.cancelMine(req.user.sub);
  }

  /**
   * POST /api/v1/subscriptions/webhook
   * Stripe webhook — verifies signature using STRIPE_WEBHOOK_SECRET,
   * idempotent via SubscriptionEvent.stripeEventId unique constraint.
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe subscription webhook (no auth)' })
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!req.rawBody) {
      throw new BadRequestException('Raw body missing — check main.ts config');
    }
    const event = this.subscriptions.verifyWebhook(req.rawBody, signature);
    return this.subscriptions.handleWebhook(event);
  }
}

/**
 * Separate controller for usage/quota read-only endpoints used by FE
 * to render "2/3 missions this month" badges.
 */
@ApiTags('Usage')
@Controller('api/v1/usage')
export class UsageController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('missions-count-month')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Missions published by user this month' })
  @ApiResponse({ status: 200 })
  async missionsCount(@Request() req: { user: { sub: string } }) {
    const used = await this.subscriptions.missionsThisMonth(req.user.sub);
    const hasPaid = await this.subscriptions.hasActiveSubscription(
      req.user.sub,
    );
    return {
      used,
      limit: hasPaid ? null : 3,
      hasPaidPlan: hasPaid,
    };
  }
}

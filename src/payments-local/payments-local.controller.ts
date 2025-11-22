import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsLocalService } from './payments-local.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsLocalController {
  constructor(private readonly paymentsService: PaymentsLocalService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a payment intent',
    description:
      'Creates a Stripe PaymentIntent for a completed mission. Requires Stripe to be configured.',
  })
  @ApiResponse({
    status: 201,
    description: 'PaymentIntent created successfully',
    type: PaymentIntentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({
    status: 503,
    description: 'Stripe not configured',
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: any,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto.missionId,
      req.user.sub,
      req.user.role,
    );
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Receives Stripe webhook events for payment processing. Called by Stripe servers.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // rawBody is available thanks to `rawBody: true` in main.ts
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new Error('Raw body not available for webhook verification');
    }

    return this.paymentsService.handleWebhook(rawBody as Buffer, signature);
  }
}


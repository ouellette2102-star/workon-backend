import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateCheckoutDto,
  CheckoutResponseDto,
  InvoiceResponseDto,
  InvoicePreviewDto,
} from './dto/checkout.dto';

/**
 * Checkout Controller
 * 
 * Provides Stripe Checkout Session flow for LocalMissions.
 * Simpler than PaymentIntent for mobile apps - just redirect to URL.
 */
@ApiTags('Payments')
@ApiBearerAuth()
@Controller('api/v1/payments')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * POST /api/v1/payments/checkout
   * Create a Stripe Checkout Session for a LocalMission
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create Checkout Session',
    description: `
      Creates a Stripe Checkout Session for paying a completed LocalMission.
      
      **Flow:**
      1. Call this endpoint with the missionId
      2. Receive checkoutUrl
      3. Redirect user to checkoutUrl
      4. Stripe handles the payment UI
      5. User is redirected to success/cancel URL
      6. Webhook updates invoice & mission status
      
      **Pricing:**
      - Subtotal: Mission price
      - Platform fee: 12%
      - Total: Subtotal + Platform fee
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created',
    type: CheckoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Mission not in payable state' })
  @ApiResponse({ status: 403, description: 'Not authorized to pay this mission' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 503, description: 'Stripe not configured' })
  async createCheckout(
    @Request() req: any,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    const userId = req.user.sub || req.user.userId;
    
    this.logger.log(`Creating checkout for mission ${dto.missionId} by user ${userId}`);
    
    const result = await this.invoiceService.createCheckoutSession(
      dto.missionId,
      userId,
    );

    return {
      invoiceId: result.invoiceId,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    };
  }

  /**
   * GET /api/v1/payments/invoice/:id
   * Get invoice details
   */
  @Get('invoice/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get invoice details',
    description: 'Returns the invoice details including amounts and status.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: 'clxyz456def' })
  @ApiResponse({
    status: 200,
    description: 'Invoice details',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoice(
    @Request() req: any,
    @Param('id') invoiceId: string,
  ): Promise<InvoiceResponseDto> {
    const userId = req.user.sub || req.user.userId;
    return this.invoiceService.getInvoice(invoiceId, userId);
  }

  /**
   * GET /api/v1/payments/preview
   * Preview invoice calculation without creating
   */
  @Get('preview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Preview invoice calculation',
    description: 'Returns the calculated amounts for a given price without creating an invoice.',
  })
  @ApiQuery({
    name: 'priceCents',
    description: 'Price in cents (e.g., 10000 for $100)',
    example: 10000,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice calculation preview',
    type: InvoicePreviewDto,
  })
  previewInvoice(@Query('priceCents') priceCentsStr: string): InvoicePreviewDto {
    const priceCents = parseInt(priceCentsStr, 10);
    
    if (isNaN(priceCents) || priceCents <= 0) {
      throw new Error('priceCents must be a positive integer');
    }

    const calculation = this.invoiceService.calculateInvoice(priceCents, 'Preview');

    return {
      subtotal: calculation.subtotalCents / 100,
      platformFee: calculation.platformFeeCents / 100,
      platformFeePercent: 12, // Match PLATFORM_FEE_RATE
      taxes: calculation.taxesCents / 100,
      total: calculation.totalCents / 100,
      currency: calculation.currency,
    };
  }
}


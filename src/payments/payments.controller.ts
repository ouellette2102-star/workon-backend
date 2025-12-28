import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments/mission/:missionId/intent
   * Créer un PaymentIntent escrow pour une mission
   */
  @Post('mission/:missionId/intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  @ApiOperation({
    summary: 'Create escrow PaymentIntent for a mission',
    description:
      'Creates a Stripe PaymentIntent with manual capture (escrow). ' +
      'Funds are authorized but not captured until mission completion. ' +
      'Returns clientSecret for frontend payment confirmation.',
  })
  @ApiParam({ name: 'missionId', description: 'Mission ID', example: 'mission_123' })
  @ApiResponse({ status: 201, description: 'PaymentIntent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid amount or Stripe not configured' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 409, description: 'Payment already captured for this mission' })
  async createPaymentIntent(
    @Request() req: any,
    @Param('missionId') missionId: string,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.paymentsService.createPaymentIntent(userId, { ...createPaymentIntentDto, missionId });
  }

  /**
   * POST /api/v1/payments/mission/:missionId/capture
   * Capturer les fonds d'un PaymentIntent
   */
  @Post('mission/:missionId/capture')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  @ApiOperation({
    summary: 'Capture authorized payment',
    description:
      'Captures the previously authorized funds for a mission. ' +
      'Call this when the mission is completed and approved. ' +
      'The payment must be in AUTHORIZED status.',
  })
  @ApiParam({ name: 'missionId', description: 'Mission ID', example: 'mission_123' })
  @ApiResponse({ status: 200, description: 'Payment captured successfully' })
  @ApiResponse({ status: 400, description: 'Payment not in capturable state' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async capturePayment(@Request() req: any, @Param('missionId') missionId: string) {
    const userId = req.user.userId || req.user.sub;
    return this.paymentsService.capturePaymentIntent(userId, missionId);
  }

  /**
   * POST /api/v1/payments/mission/:missionId/cancel
   * Annuler un PaymentIntent avant capture
   */
  @Post('mission/:missionId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  @ApiOperation({
    summary: 'Cancel authorized payment',
    description:
      'Cancels a PaymentIntent before capture (releases the hold). ' +
      'Use when mission is cancelled or payment is no longer needed. ' +
      'Cannot cancel after capture.',
  })
  @ApiParam({ name: 'missionId', description: 'Mission ID', example: 'mission_123' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Payment already captured or cancelled' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async cancelPayment(@Request() req: any, @Param('missionId') missionId: string) {
    const userId = req.user.userId || req.user.sub;
    return this.paymentsService.cancelPaymentIntent(userId, missionId);
  }

  /**
   * GET /api/v1/payments/mission/:missionId/status
   * Récupérer le status d'un paiement
   */
  @Get('mission/:missionId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get payment status for a mission',
    description: 'Returns the current payment status and details for a mission.',
  })
  @ApiParam({ name: 'missionId', description: 'Mission ID', example: 'mission_123' })
  @ApiResponse({ status: 200, description: 'Payment status returned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('missionId') missionId: string) {
    return this.paymentsService.getPaymentStatus(missionId);
  }

  /**
   * Legacy endpoint (backward compatibility)
   */
  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  @ApiOperation({ summary: 'Create PaymentIntent (legacy)', deprecated: true })
  async createPaymentIntentLegacy(@Request() req: any, @Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    const userId = req.user.userId || req.user.sub;
    return this.paymentsService.createPaymentIntent(userId, createPaymentIntentDto);
  }
}


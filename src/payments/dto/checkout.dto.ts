import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Request DTO for creating a checkout session
 */
export class CreateCheckoutDto {
  @ApiProperty({
    description: 'ID of the LocalMission to pay for',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;
}

/**
 * Response DTO for checkout session creation
 */
export class CheckoutResponseDto {
  @ApiProperty({
    description: 'Invoice ID for tracking',
    example: 'clxyz456def',
  })
  invoiceId: string;

  @ApiProperty({
    description: 'Stripe Checkout URL - redirect user here',
    example: 'https://checkout.stripe.com/c/pay/cs_test_xxx',
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Stripe Session ID',
    example: 'cs_test_xxx',
  })
  sessionId: string;
}

/**
 * Response DTO for invoice details
 */
export class InvoiceResponseDto {
  @ApiProperty({ description: 'Invoice ID', example: 'clxyz456def' })
  id: string;

  @ApiProperty({ description: 'Mission ID', example: 'clxyz123abc', nullable: true })
  missionId: string | null;

  @ApiProperty({ description: 'Subtotal (service price)', example: 100.00 })
  subtotal: number;

  @ApiProperty({ description: 'Platform fee (WorkOn)', example: 12.00 })
  platformFee: number;

  @ApiProperty({ description: 'Taxes (if applicable)', example: 0 })
  taxes: number;

  @ApiProperty({ description: 'Total amount to pay', example: 112.00 })
  total: number;

  @ApiProperty({ description: 'Currency', example: 'CAD' })
  currency: string;

  @ApiProperty({
    description: 'Invoice status',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
    example: 'PENDING',
  })
  status: string;

  @ApiPropertyOptional({ description: 'Invoice description', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ description: 'Payment date (if paid)', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
}

/**
 * Invoice calculation preview (for display before checkout)
 */
export class InvoicePreviewDto {
  @ApiProperty({ description: 'Subtotal (service price) in dollars', example: 100.00 })
  subtotal: number;

  @ApiProperty({ description: 'Platform fee (WorkOn) in dollars', example: 12.00 })
  platformFee: number;

  @ApiProperty({ description: 'Platform fee percentage', example: 12 })
  platformFeePercent: number;

  @ApiProperty({ description: 'Taxes in dollars', example: 0 })
  taxes: number;

  @ApiProperty({ description: 'Total amount in dollars', example: 112.00 })
  total: number;

  @ApiProperty({ description: 'Currency', example: 'CAD' })
  currency: string;
}


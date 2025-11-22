import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({
    example: 'pi_1234567890',
    description: 'Stripe PaymentIntent ID',
  })
  paymentIntentId: string;

  @ApiProperty({
    example: 'client_secret_1234567890',
    description: 'Client secret for frontend confirmation',
  })
  clientSecret: string;

  @ApiProperty({
    example: 7500,
    description: 'Amount in cents',
  })
  amount: number;

  @ApiProperty({
    example: 'CAD',
    description: 'Currency code',
  })
  currency: string;

  @ApiProperty({
    example: 'cly_mission123',
    description: 'Associated mission ID',
  })
  missionId: string;
}


import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiPropertyOptional({
    description: 'Mission ID (optional if provided in URL path)',
    example: 'mission_123456789',
  })
  @IsOptional()
  @IsString()
  missionId?: string;

  @ApiProperty({
    description: 'Amount in cents (e.g., 7500 for $75.00 CAD)',
    example: 7500,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amountCents: number;
}


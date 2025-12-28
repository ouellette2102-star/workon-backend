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
    description: 'Amount in CAD dollars (will be converted to cents)',
    example: 75.0,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}


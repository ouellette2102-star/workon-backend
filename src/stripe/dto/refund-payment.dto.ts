import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ example: 'pay_123456', description: 'Payment ID to refund' })
  @IsString()
  paymentId: string;

  @ApiPropertyOptional({ example: 'Service non satisfaisant', description: 'Reason for refund' })
  @IsString()
  @IsOptional()
  reason?: string;
}

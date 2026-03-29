import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({ example: 'Remboursement partiel accordé', description: 'Resolution description' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiProperty({ example: true, description: 'Whether to issue a refund' })
  @IsBoolean()
  refundRequested: boolean;
}

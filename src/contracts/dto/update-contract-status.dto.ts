import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

export class UpdateContractStatusDto {
  @ApiProperty({
    description: 'New contract status',
    enum: ContractStatus,
    example: 'ACCEPTED',
  })
  @IsEnum(ContractStatus)
  status!: ContractStatus;
}


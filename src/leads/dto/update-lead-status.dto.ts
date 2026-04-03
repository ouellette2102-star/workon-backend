import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus, example: 'CONTACTED' })
  @IsEnum(LeadStatus, { message: 'Statut invalide' })
  status: LeadStatus;
}

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MissionStatus } from '@prisma/client';

/**
 * DTO pour la mise à jour du statut d'une mission
 */
export class UpdateMissionStatusDto {
  @ApiProperty({
    description: 'Nouveau statut de la mission',
    enum: MissionStatus,
    example: 'IN_PROGRESS',
    enumName: 'MissionStatus',
  })
  @IsEnum(MissionStatus, {
    message: 'status must be one of CREATED, RESERVED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  status!: MissionStatus;
}

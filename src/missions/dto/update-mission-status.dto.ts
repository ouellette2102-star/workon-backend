import { IsEnum } from 'class-validator';
import { MissionStatus } from '@prisma/client';

export class UpdateMissionStatusDto {
  @IsEnum(MissionStatus, {
    message:
      'status must be one of CREATED, RESERVED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  status!: MissionStatus;
}


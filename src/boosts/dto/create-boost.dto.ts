import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMissionBoostDto {
  @ApiProperty({ description: 'LocalMission id to boost' })
  @IsString()
  missionId!: string;
}

export class CreateAccountBoostDto {
  @ApiProperty({
    required: false,
    description: 'Optional note for the reviewer',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

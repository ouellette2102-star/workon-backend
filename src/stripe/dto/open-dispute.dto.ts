import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenDisputeDto {
  @ApiProperty({ example: 'mission_123', description: 'Mission ID' })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ example: 'Travail non complété comme convenu', description: 'Reason for dispute' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 'cly_mission123',
    description: 'Mission ID to create payment for',
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;
}


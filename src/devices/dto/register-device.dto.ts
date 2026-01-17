import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Device platform', enum: ['android', 'ios'] })
  @IsString()
  @IsIn(['android', 'ios'])
  platform: string;
}


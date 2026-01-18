import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique device identifier (vendor ID, IDFV, etc.)',
    example: 'device_abc123xyz',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.IOS,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({
    description: 'Push notification token (FCM/APNs)',
    example: 'fcm_token_abc123...',
  })
  @IsOptional()
  @IsString()
  pushToken?: string;

  @ApiPropertyOptional({
    description: 'App version string',
    example: '1.2.3',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

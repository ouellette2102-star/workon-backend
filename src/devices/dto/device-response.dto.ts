import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceResponseDto {
  @ApiProperty({ description: 'Device record ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'User ID who owns this device' })
  userId: string;

  @ApiProperty({ description: 'Unique device identifier' })
  deviceId: string;

  @ApiProperty({ description: 'Platform: ios, android, web' })
  platform: string;

  @ApiPropertyOptional({ description: 'Push notification token' })
  pushToken?: string;

  @ApiPropertyOptional({ description: 'App version' })
  appVersion?: string;

  @ApiProperty({ description: 'Whether device is active' })
  active: boolean;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastSeenAt: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

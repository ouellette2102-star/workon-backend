import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Device Response DTO
 *
 * Represents a registered device for push notifications.
 */
export class DeviceResponseDto {
  @ApiProperty({
    description: 'Device record ID (UUID)',
    example: 'device_abc123-def456-ghi789',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this device',
    example: 'user_xyz789',
  })
  userId: string;

  @ApiProperty({
    description: 'Unique device identifier (vendor ID, IDFV, etc.)',
    example: 'device_vendor_123abc',
  })
  deviceId: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android', 'web'],
    example: 'ios',
  })
  platform: string;

  @ApiPropertyOptional({
    description: 'Push notification token (FCM/APNs)',
    example: 'fcm_token_xyz123abc456...',
  })
  pushToken?: string;

  @ApiPropertyOptional({
    description: 'App version string',
    example: '2.1.0',
  })
  appVersion?: string;

  @ApiProperty({
    description: 'Whether the device is active (not deleted)',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastSeenAt: Date;

  @ApiProperty({
    description: 'Device registration timestamp',
    example: '2024-01-01T08:00:00.000Z',
  })
  createdAt: Date;
}

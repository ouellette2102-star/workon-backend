import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  IsEnum,
} from 'class-validator';
import { DigestFrequency } from '@prisma/client';

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable in-app notifications' })
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (HH:MM format, 24h)',
    example: '22:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:MM format (24h)',
  })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (HH:MM format, 24h)',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:MM format (24h)',
  })
  quietHoursEnd?: string | null;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/Toronto',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Enable digest mode (bundle notifications)' })
  @IsBoolean()
  @IsOptional()
  digestEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Digest frequency',
    enum: DigestFrequency,
  })
  @IsEnum(DigestFrequency)
  @IsOptional()
  digestFrequency?: DigestFrequency | null;
}


import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { NotificationType, NotificationPriority } from '@prisma/client';

export class QueueNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Notification body',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    type: 'object',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    default: 'NORMAL',
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Schedule delivery for a specific time',
    example: '2026-01-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Correlation ID for tracking',
  })
  @IsString()
  @IsOptional()
  correlationId?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicates',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}


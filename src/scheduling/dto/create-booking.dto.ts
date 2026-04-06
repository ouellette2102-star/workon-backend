import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'worker_123', description: 'Worker ID to book' })
  @IsString()
  workerId: string;

  @ApiPropertyOptional({ description: 'Recurring template ID if booking from template' })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ example: 'Nettoyage résidentiel', description: 'Booking title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Booking description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-04-15T09:00:00Z', description: 'Scheduled date/time (ISO 8601)' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 120, description: 'Duration in minutes' })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiPropertyOptional({ example: 'America/Toronto', description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 150, description: 'Price in CAD' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'fixed', description: 'Price type (fixed, hourly, etc.)' })
  @IsString()
  priceType: string;
}

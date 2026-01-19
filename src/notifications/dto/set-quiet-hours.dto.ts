import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class SetQuietHoursDto {
  @ApiPropertyOptional({
    description: 'Quiet hours start time (HH:MM format, 24h). Set to null to disable.',
    example: '22:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:MM format (24h)',
  })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (HH:MM format, 24h). Set to null to disable.',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:MM format (24h)',
  })
  quietHoursEnd?: string | null;

  @ApiPropertyOptional({
    description: 'User timezone for quiet hours calculation',
    example: 'America/Toronto',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}


import { IsArray, IsNumber, IsString, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AvailabilitySlotDto {
  @ApiProperty({ example: 1, description: 'Day of week (0=Sunday, 6=Saturday)' })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 'America/Toronto' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

export class BlockTimeOffDto {
  @ApiProperty({ example: '2026-04-20' })
  @IsString()
  specificDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 'America/Toronto' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

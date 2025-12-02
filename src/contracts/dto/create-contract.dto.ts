import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({
    description: 'Mission ID',
    example: 'mission_123456789',
  })
  @IsString()
  @IsNotEmpty()
  missionId!: string;

  @ApiProperty({
    description: 'Total amount for the contract',
    example: 500.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Hourly rate (if applicable)',
    example: 25.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Contract start date (ISO 8601)',
    example: '2025-01-15T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({
    description: 'Contract end date (ISO 8601)',
    example: '2025-01-15T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}


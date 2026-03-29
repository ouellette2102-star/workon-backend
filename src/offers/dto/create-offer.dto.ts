import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({
    description: 'ID of the mission to make an offer on',
    example: 'local_1234567890_abc123',
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({
    description: 'Proposed price for the mission in cents',
    example: 15000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({
    description: 'Optional message to the mission owner',
    example: 'I can complete this task within 2 hours.',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}


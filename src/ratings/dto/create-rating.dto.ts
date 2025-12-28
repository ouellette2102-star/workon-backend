import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: 'ID of the completed mission' })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ description: 'ID of the user being rated' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({
    description: 'Rating score (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({
    description: 'Optional comment about the rating',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}


import { IsString, IsInt, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'ID of the user being reviewed',
    example: 'user_abc123',
  })
  @IsString()
  toUserId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'ID of the mission associated with this review',
    example: 'mission_xyz789',
  })
  @IsOptional()
  @IsString()
  missionId?: string;

  @ApiPropertyOptional({
    description: 'Review comment',
    maxLength: 500,
    example: 'Excellent travail, très professionnel!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}


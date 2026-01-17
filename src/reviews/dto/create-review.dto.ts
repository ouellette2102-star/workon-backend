import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Target user ID (local user id)' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty({ description: 'Rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Mission ID (optional)' })
  @IsString()
  @IsOptional()
  missionId?: string;

  @ApiPropertyOptional({ description: 'Review comment (optional)' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Tags/labels (optional)', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}


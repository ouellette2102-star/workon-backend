import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewAuthorDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  authorId?: string;

  @ApiPropertyOptional({ type: ReviewAuthorDto })
  author?: ReviewAuthorDto;

  @ApiPropertyOptional()
  missionId?: string;
}

export class RatingSummaryDto {
  @ApiProperty({ description: 'Average rating (1.0-5.0)', example: 4.5 })
  average: number;

  @ApiProperty({ description: 'Total number of reviews', example: 12 })
  count: number;

  @ApiPropertyOptional({
    description: 'Distribution by rating level',
    example: { '1': 0, '2': 1, '3': 2, '4': 4, '5': 5 },
  })
  distribution?: Record<string, number>;
}


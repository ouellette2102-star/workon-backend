import { ApiProperty } from '@nestjs/swagger';

export class RatingAuthorDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;
}

export class RatingResponseDto {
  @ApiProperty({ description: 'Unique ID of the rating' })
  id: string;

  @ApiProperty({ description: 'ID of the mission' })
  missionId: string;

  @ApiProperty({ description: 'ID of the author (who gave the rating)' })
  authorId: string;

  @ApiProperty({ description: 'ID of the target user (who received the rating)' })
  targetUserId: string;

  @ApiProperty({ description: 'Rating score (1-5)', minimum: 1, maximum: 5 })
  score: number;

  @ApiProperty({ description: 'Optional comment', required: false })
  comment: string | null;

  @ApiProperty({ description: 'Timestamp when the rating was created' })
  createdAt: Date;

  @ApiProperty({ type: () => RatingAuthorDto, description: 'Author info' })
  author: RatingAuthorDto;
}

export class UserRatingsResponseDto {
  @ApiProperty({ type: [RatingResponseDto], description: 'List of ratings' })
  ratings: RatingResponseDto[];

  @ApiProperty({ description: 'Average rating score' })
  averageScore: number;

  @ApiProperty({ description: 'Total number of ratings' })
  totalCount: number;
}


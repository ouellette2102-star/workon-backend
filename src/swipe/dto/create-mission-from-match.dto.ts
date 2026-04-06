import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMissionFromMatchDto {
  @ApiProperty({ example: 'sm_abc123', description: 'Match ID' })
  @IsString()
  matchId: string;

  @ApiProperty({ example: 'Réparation plomberie', description: 'Mission title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Mission description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'plumbing', description: 'Category' })
  @IsString()
  category: string;

  @ApiProperty({ example: 150, description: 'Price in CAD' })
  @IsNumber()
  @Min(0)
  price: number;
}

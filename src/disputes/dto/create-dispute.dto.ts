import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ example: 'mission_123', description: 'Mission ID to dispute' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: 'Travail non complété selon les termes', description: 'Reason for dispute' })
  @IsString()
  reason: string;
}

export class AddEvidenceDto {
  @ApiProperty({ example: 'photo', description: 'Evidence type (photo, text, document)' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Le travail était incomplet', description: 'Evidence content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'URL of uploaded file' })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ example: 'Remboursement partiel de 50%', description: 'Resolution description' })
  @IsString()
  resolution: string;
}

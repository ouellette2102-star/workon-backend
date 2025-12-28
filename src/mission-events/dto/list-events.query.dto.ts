import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Curseur pour pagination (ID du dernier event)',
    example: 'clx1234567890',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Nombre d\'événements à retourner',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ListMissionEventsQueryDto extends ListEventsQueryDto {}


import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor for next page (ID of last item)',
    example: 'lm_abc123',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    count: number;
  };
}

/**
 * Build Prisma cursor pagination args from DTO
 */
export function buildCursorArgs(dto: CursorPaginationDto) {
  const take = (dto.limit ?? 20) + 1; // Fetch one extra to detect hasMore

  if (dto.cursor) {
    return {
      take,
      skip: 1, // Skip the cursor item itself
      cursor: { id: dto.cursor },
    };
  }

  return { take };
}

/**
 * Process raw results into paginated response
 */
export function paginateResults<T extends { id: string }>(
  items: T[],
  limit: number = 20,
): CursorPaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
      count: data.length,
    },
  };
}

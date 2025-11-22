import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MissionFeedFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  maxDistance?: number; // en kilomètres
}

export interface MissionFeedResponse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  hourlyRate: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  employerId: string;
  employerName: string | null;
  priceCents: number;
  currency: string;
  distance: number | null; // distance en km
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}


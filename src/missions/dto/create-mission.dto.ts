import { IsOptional, IsString, IsNumber, IsISO8601 } from 'class-validator';

export class CreateMissionDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @IsISO8601()
  @IsOptional()
  startsAt?: string;

  @IsISO8601()
  @IsOptional()
  endsAt?: string;
}


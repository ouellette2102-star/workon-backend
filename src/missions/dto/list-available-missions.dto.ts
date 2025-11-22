import { IsOptional, IsString } from 'class-validator';

export class ListAvailableMissionsDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  category?: string;
}


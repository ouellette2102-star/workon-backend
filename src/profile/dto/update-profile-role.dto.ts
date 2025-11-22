import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProfileRole } from './profile-response.dto';

export class UpdateProfileDto {
  @IsEnum(ProfileRole, {
    message:
      'primaryRole doit être parmi WORKER, EMPLOYER, ADMIN ou CLIENT_RESIDENTIAL',
  })
  @IsOptional()
  primaryRole?: ProfileRole;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsString()
  @IsOptional()
  @MinLength(4)
  @MaxLength(32)
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(120)
  city?: string;
}


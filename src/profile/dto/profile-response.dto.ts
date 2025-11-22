import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ProfileRole {
  WORKER = 'WORKER',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN',
  CLIENT_RESIDENTIAL = 'CLIENT_RESIDENTIAL',
}

export class ProfileResponseDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  fullName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @IsEnum(ProfileRole)
  primaryRole!: ProfileRole;

  @IsBoolean()
  isWorker!: boolean;

  @IsBoolean()
  isEmployer!: boolean;

  @IsBoolean()
  isClientResidential!: boolean;
}


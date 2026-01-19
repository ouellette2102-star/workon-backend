import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * Profile Response DTO
 *
 * Represents user profile information.
 */
export class ProfileResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'user_abc123xyz',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
    maxLength: 120,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1-514-555-1234',
    maxLength: 32,
  })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    description: 'User city/region',
    example: 'Montréal',
    maxLength: 120,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @ApiProperty({
    description: 'Primary user role',
    enum: ProfileRole,
    example: ProfileRole.WORKER,
  })
  @IsEnum(ProfileRole)
  primaryRole!: ProfileRole;

  @ApiProperty({
    description: 'User has worker role capabilities',
    example: true,
  })
  @IsBoolean()
  isWorker!: boolean;

  @ApiProperty({
    description: 'User has employer role capabilities',
    example: false,
  })
  @IsBoolean()
  isEmployer!: boolean;

  @ApiProperty({
    description: 'User has residential client role capabilities',
    example: false,
  })
  @IsBoolean()
  isClientResidential!: boolean;
}


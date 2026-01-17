import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  WORKER = 'worker',
  EMPLOYER = 'employer',
  RESIDENTIAL_CLIENT = 'residential_client',
}

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
    default: '',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
    default: '',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+1 514 555 0100',
    description: 'User phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Montréal',
    description: 'User city/region',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.WORKER,
    description: 'User role in the platform',
    default: UserRole.WORKER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}


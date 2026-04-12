import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Registration DTO - extends CreateUserDto
 * Same fields as CreateUserDto (email, password, firstName, lastName, role, etc.)
 */
export class RegisterDto extends CreateUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (min 8 characters)',
    minLength: 8,
  })
  password: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user explicitly accepted Terms of Service and Privacy Policy at registration',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;
}


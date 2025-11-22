import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

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
}


import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Authentication Response DTO
 * 
 * Returned by /auth/register and /auth/login endpoints.
 * Contains JWT token and authenticated user information.
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token (use in Authorization: Bearer <token>)',
    type: String,
  })
  accessToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: () => UserResponseDto,
  })
  user: UserResponseDto;
}


import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Authentication Response DTO
 * 
 * Returned by /auth/register and /auth/login endpoints.
 * Contains JWT tokens and authenticated user information.
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token (use in Authorization: Bearer <token>)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (use to obtain new access token)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: () => UserResponseDto,
  })
  user: UserResponseDto;
}


import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * User Response DTO
 * 
 * This DTO is returned by auth and user endpoints.
 * Examples are minimal to avoid showing dummy data in Swagger.
 * Real API responses will show actual user data from the database.
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({
    description: 'User unique identifier',
    type: String,
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'User email address',
    type: String,
  })
  email: string;

  @Expose()
  @ApiProperty({
    description: 'User first name',
    type: String,
  })
  firstName: string;

  @Expose()
  @ApiProperty({
    description: 'User last name',
    type: String,
  })
  lastName: string;

  @Expose()
  @ApiProperty({
    description: 'User phone number',
    type: String,
    nullable: true,
    required: false,
  })
  phone: string | null;

  @Expose()
  @ApiProperty({
    description: 'User city/region',
    type: String,
    nullable: true,
    required: false,
  })
  city: string | null;

  @Expose()
  @ApiProperty({
    description: 'User role (worker, employer, residential_client)',
    type: String,
  })
  role: string;

  @Expose()
  @ApiProperty({
    description: 'Account active status',
    type: Boolean,
    required: false,
  })
  active?: boolean;

  @Expose()
  @ApiProperty({
    description: 'Account creation date',
    type: Date,
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Last update date',
    type: Date,
  })
  updatedAt: Date;

  // hashedPassword is excluded by default via @Exclude() decorator
}


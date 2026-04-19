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
    description: 'Profile picture URL',
    type: String,
    nullable: true,
    required: false,
  })
  pictureUrl: string | null;

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

  // ── Worker-facing profile fields (editable via PATCH /users/me) ──
  // Added 2026-04-19 so the FE worker-card editor round-trips its own
  // saved values instead of reading them as undefined and overwriting
  // the DB with empty strings on save.

  @Expose()
  @ApiProperty({ description: 'Worker short title', type: String, nullable: true, required: false })
  jobTitle?: string | null;

  @Expose()
  @ApiProperty({ description: 'Hourly rate in CAD', type: Number, nullable: true, required: false })
  hourlyRate?: number | null;

  @Expose()
  @ApiProperty({ description: 'Public bio', type: String, nullable: true, required: false })
  bio?: string | null;

  @Expose()
  @ApiProperty({ description: 'Primary service category', type: String, nullable: true, required: false })
  category?: string | null;

  @Expose()
  @ApiProperty({ description: 'Service radius km', type: Number, nullable: true, required: false })
  serviceRadiusKm?: number | null;

  @Expose()
  @ApiProperty({ description: 'Portfolio photo URLs', type: [String], required: false })
  gallery?: string[];

  // hashedPassword is excluded by default via @Exclude() decorator
}


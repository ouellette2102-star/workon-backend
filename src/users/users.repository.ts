import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

/**
 * Users Repository - Encapsulates database operations
 * 
 * Using Prisma as the ORM for WorkOn
 * Separates data access logic from business logic
 */
@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto, hashedPassword: string) {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // DEBUG: Log exact data being sent to Prisma
      this.logger.debug(`[DIAGNOSTIC] Creating LocalUser with data:`, {
        id,
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        city: createUserDto.city,
        role: createUserDto.role,
        roleType: typeof createUserDto.role,
      });

      return await this.prisma.localUser.create({
        data: {
          id,
          email: createUserDto.email,
          hashedPassword,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phone: createUserDto.phone,
          city: createUserDto.city,
          role: createUserDto.role,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // hashedPassword excluded
        },
      });
    } catch (error) {
      // DEBUG: Capture full error details
      this.logger.error(`[DIAGNOSTIC] Prisma error during user creation:`, {
        errorName: error?.constructor?.name,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorMeta: error?.meta,
        fullError: JSON.stringify(error, null, 2),
      });
      
      // Re-throw to preserve error handling in service layer
      throw error;
    }
  }

  /**
   * Find user by email (for login)
   * Includes hashedPassword for credential verification
   */
  async findByEmail(email: string) {
    return this.prisma.localUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        hashedPassword: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by ID (for auth, profile)
   * Excludes hashedPassword
   */
  async findById(id: string) {
    return this.prisma.localUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user profile
   */
  async update(id: string, updateUserDto: UpdateUserProfileDto) {
    this.logger.log(`Updating user profile: ${id}`);

    return this.prisma.localUser.update({
      where: { id },
      data: {
        ...updateUserDto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.localUser.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, hashedPassword: string) {
    this.logger.log(`Updating password for user: ${id}`);

    return this.prisma.localUser.update({
      where: { id },
      data: {
        hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete (deactivate) user
   */
  async deactivate(id: string) {
    this.logger.warn(`Deactivating user: ${id}`);

    return this.prisma.localUser.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * GDPR-compliant account deletion
   * 
   * Anonymizes all PII and marks account as deleted.
   * Keeps ID and timestamps for referential integrity.
   * 
   * @param id - User ID to delete
   * @returns Updated user record (anonymized)
   */
  async anonymizeAndDelete(id: string) {
    this.logger.warn(`GDPR deletion for user: ${id}`);

    const now = new Date();
    const anonymizedEmail = `deleted_${id}@deleted.local`;

    return this.prisma.localUser.update({
      where: { id },
      data: {
        // Anonymize PII
        email: anonymizedEmail,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        city: null,
        // Invalidate password (random hash, impossible to login)
        hashedPassword: `DELETED_${now.getTime()}_${Math.random().toString(36)}`,
        // Mark as inactive and deleted
        active: false,
        deletedAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Check if user is already deleted
   */
  async isDeleted(id: string): Promise<boolean> {
    const user = await this.prisma.localUser.findUnique({
      where: { id },
      select: { deletedAt: true },
    });
    return user?.deletedAt !== null;
  }
}


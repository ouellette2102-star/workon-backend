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
          firstName: createUserDto.firstName ?? '',
          lastName: createUserDto.lastName ?? '',
          phone: createUserDto.phone,
          city: createUserDto.city,
          role: createUserDto.role ?? 'worker',
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
        pictureUrl: true,
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
        pictureUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user email
   */
  async updateEmail(id: string, email: string) {
    this.logger.log(`Updating email for user: ${id}`);

    return this.prisma.localUser.update({
      where: { id },
      data: {
        email,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        pictureUrl: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user profile picture URL
   */
  async updatePictureUrl(id: string, pictureUrl: string) {
    this.logger.log(`Updating profile picture for user: ${id}`);

    return this.prisma.localUser.update({
      where: { id },
      data: {
        pictureUrl,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        pictureUrl: true,
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
   * GDPR-compliant account deletion with mission cleanup
   * 
   * In a single transaction:
   * 1. Cancels all open missions created by the user
   * 2. Removes worker assignment from open missions (if worker)
   * 3. Anonymizes all PII
   * 4. Marks account as deleted
   * 
   * Keeps ID and timestamps for referential integrity.
   * Preserves completed/paid missions for audit.
   * 
   * @param id - User ID to delete
   * @returns Deletion result with stats
   */
  async anonymizeAndDelete(id: string): Promise<{
    id: string;
    deletedAt: Date;
    cancelledMissionsCount: number;
    unassignedMissionsCount: number;
  }> {
    this.logger.warn(`GDPR deletion for user: ${id}`);

    const now = new Date();
    const anonymizedEmail = `deleted_${id}@deleted.local`;

    // Use transaction for atomic operation
    return this.prisma.$transaction(async (tx) => {
      // 1. Cancel open missions CREATED by this user
      const cancelledMissions = await tx.localMission.updateMany({
        where: {
          createdByUserId: id,
          status: 'open',
        },
        data: {
          status: 'cancelled',
          updatedAt: now,
        },
      });

      this.logger.log(`Cancelled ${cancelledMissions.count} open missions created by user ${id}`);

      // 2. Unassign this user from open/assigned missions (if they were the worker)
      const unassignedMissions = await tx.localMission.updateMany({
        where: {
          assignedToUserId: id,
          status: { in: ['open', 'assigned'] },
        },
        data: {
          assignedToUserId: null,
          status: 'open', // Revert to open so another worker can take it
          updatedAt: now,
        },
      });

      this.logger.log(`Unassigned ${unassignedMissions.count} missions from worker ${id}`);

      // 3. Delete pending offers from this user
      await tx.localOffer.deleteMany({
        where: {
          workerId: id,
          status: 'PENDING',
        },
      });

      // 4. Delete unused OTP records
      await tx.emailOtp.deleteMany({
        where: { userId: id },
      });

      // 5. Anonymize user PII
      const updatedUser = await tx.localUser.update({
        where: { id },
        data: {
          // Anonymize PII
          email: anonymizedEmail,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          city: null,
          pictureUrl: null,
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

      return {
        id: updatedUser.id,
        deletedAt: updatedUser.deletedAt!,
        cancelledMissionsCount: cancelledMissions.count,
        unassignedMissionsCount: unassignedMissions.count,
      };
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


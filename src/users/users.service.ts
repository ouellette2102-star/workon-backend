import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Users Service - Business logic for user management
 * 
 * Handles user CRUD operations, password hashing, validation
 */
// Allowed MIME types for profile pictures
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12; // bcrypt salt rounds (production-ready)
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'users');

  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Create a new user with hashed password
   * 
   * @throws ConflictException if email already exists
   */
  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const emailExists = await this.usersRepository.emailExists(
      createUserDto.email,
    );

    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(createUserDto.password);

    // Create user (password excluded from DTO passed to repository)
    const user = await this.usersRepository.create(
      createUserDto,
      hashedPassword,
    );

    this.logger.log(`User created successfully: ${user.email}`);

    return user;
  }

  /**
   * Find user by email (for authentication)
   */
  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * Find user by ID
   * 
   * @throws NotFoundException if user not found
   */
  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   * 
   * @throws NotFoundException if user not found
   */
  async updateProfile(id: string, updateUserDto: UpdateUserProfileDto) {
    // Verify user exists
    await this.findById(id);

    // Update profile
    const updatedUser = await this.usersRepository.update(id, updateUserDto);

    this.logger.log(`User profile updated: ${id}`);

    return updatedUser;
  }

  /**
   * Update user email with uniqueness check
   */
  async updateEmail(id: string, newEmail: string) {
    const normalized = newEmail.trim().toLowerCase();

    const existing = await this.usersRepository.findByEmail(normalized);
    if (existing && existing.id !== id) {
      throw new ConflictException('Email already registered');
    }

    return this.usersRepository.updateEmail(id, normalized);
  }

  /**
   * Verify user password (for login)
   */
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Update user password
   * 
   * @param id - User ID
   * @param newPassword - New plain password (will be hashed)
   */
  async updatePassword(id: string, newPassword: string) {
    // Verify user exists
    await this.findById(id);

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.usersRepository.updatePassword(id, hashedPassword);

    this.logger.log(`Password updated for user: ${id}`);
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivate(id: string) {
    await this.findById(id); // Verify exists
    return this.usersRepository.deactivate(id);
  }

  /**
   * Delete user account (GDPR-compliant)
   * 
   * Anonymizes PII, cancels open missions, and marks account as deleted.
   * This is idempotent: calling on already-deleted account returns success.
   * 
   * @param id - User ID to delete
   * @returns Deletion result with stats
   * @throws NotFoundException if user not found
   */
  async deleteAccount(id: string): Promise<{
    deleted: boolean;
    cancelledMissionsCount: number;
    unassignedMissionsCount: number;
  }> {
    // Check if user exists
    const user = await this.usersRepository.findById(id);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already deleted (idempotent)
    const alreadyDeleted = await this.usersRepository.isDeleted(id);
    if (alreadyDeleted) {
      this.logger.log(`User already deleted: ${id}`);
      return {
        deleted: true,
        cancelledMissionsCount: 0,
        unassignedMissionsCount: 0,
      };
    }

    // Anonymize and delete (with mission cleanup)
    const result = await this.usersRepository.anonymizeAndDelete(id);

    this.logger.warn(`Account deleted (GDPR): ${id} - Cancelled: ${result.cancelledMissionsCount}, Unassigned: ${result.unassignedMissionsCount}`);

    return {
      deleted: true,
      cancelledMissionsCount: result.cancelledMissionsCount,
      unassignedMissionsCount: result.unassignedMissionsCount,
    };
  }

  /**
   * Upload profile picture
   * 
   * @param userId - User ID
   * @param file - Uploaded file (from Multer)
   * @param baseUrl - Base URL for constructing the picture URL
   * @returns Updated user with pictureUrl
   * @throws NotFoundException if user not found
   * @throws BadRequestException if file is invalid
   */
  async uploadPicture(
    userId: string,
    file: Express.Multer.File,
    baseUrl: string,
  ) {
    // Verify user exists
    const user = await this.findById(userId);

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Create user directory if needed
    const userDir = path.join(this.uploadsDir, userId);
    await fs.mkdir(userDir, { recursive: true });

    // Delete old picture if exists
    if (user.pictureUrl) {
      try {
        const oldFilename = path.basename(user.pictureUrl);
        const oldPath = path.join(userDir, oldFilename);
        await fs.unlink(oldPath);
        this.logger.debug(`Deleted old profile picture: ${oldPath}`);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    // Generate unique filename
    const ext = path.extname(file.originalname).toLowerCase() || this.getExtFromMime(file.mimetype);
    const filename = `profile_${crypto.randomUUID()}${ext}`;
    const filepath = path.join(userDir, filename);

    // Save file
    await fs.writeFile(filepath, file.buffer);

    // Construct URL
    const pictureUrl = `${baseUrl}/uploads/users/${userId}/${filename}`;

    // Update database
    const updatedUser = await this.usersRepository.updatePictureUrl(userId, pictureUrl);

    this.logger.log(`Profile picture uploaded for user: ${userId}`);

    return updatedUser;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return mimeToExt[mimeType] || '.jpg';
  }
}


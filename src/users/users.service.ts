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
// Keep in sync with MAX_GALLERY in the frontend worker-card-editor.tsx.
const MAX_GALLERY_ITEMS = 12;

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

    // Fire-and-forget: recompute completion score after profile update
    this.computeCompletionScore(id).catch((err) =>
      this.logger.error(`Failed to recompute completion score for ${id}: ${err.message}`),
    );

    return updatedUser;
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
   * Update profile picture via URL (no file upload)
   *
   * @param userId - User ID
   * @param pictureUrl - URL of the profile picture
   * @returns Updated user with pictureUrl
   * @throws NotFoundException if user not found
   * @throws BadRequestException if URL is invalid
   */
  async updateAvatarUrl(userId: string, pictureUrl: string) {
    // Verify user exists
    await this.findById(userId);

    // Basic URL validation
    if (!pictureUrl || typeof pictureUrl !== 'string') {
      throw new BadRequestException('pictureUrl is required');
    }

    try {
      new URL(pictureUrl);
    } catch {
      throw new BadRequestException('pictureUrl must be a valid URL');
    }

    // Update database
    const updatedUser = await this.usersRepository.updatePictureUrl(
      userId,
      pictureUrl,
    );

    this.logger.log(`Avatar URL updated for user: ${userId}`);

    return updatedUser;
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

    // Fire-and-forget: recompute completion score after picture upload
    this.computeCompletionScore(userId).catch((err) =>
      this.logger.error(`Failed to recompute completion score for ${userId}: ${err.message}`),
    );

    return updatedUser;
  }

  /**
   * Upload a gallery (worker portfolio) photo.
   * Same validation as the profile picture (JPEG/PNG/WebP, 5 MB).
   * File lands in uploads/users/<userId>/gallery/; URL appended to
   * LocalUser.gallery (capped at MAX_GALLERY_ITEMS).
   */
  async uploadGalleryPhoto(
    userId: string,
    file: Express.Multer.File,
    baseUrl: string,
  ) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!file) throw new BadRequestException('No file provided');
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

    const existingGallery = Array.isArray(
      (user as { gallery?: string[] }).gallery,
    )
      ? (user as { gallery: string[] }).gallery
      : [];
    if (existingGallery.length >= MAX_GALLERY_ITEMS) {
      throw new BadRequestException(
        `Gallery is full (max ${MAX_GALLERY_ITEMS} photos). Remove one before uploading another.`,
      );
    }

    const galleryDir = path.join(this.uploadsDir, userId, 'gallery');
    await fs.mkdir(galleryDir, { recursive: true });

    const ext =
      path.extname(file.originalname).toLowerCase() ||
      this.getExtFromMime(file.mimetype);
    const filename = `portfolio_${crypto.randomUUID()}${ext}`;
    const filepath = path.join(galleryDir, filename);
    await fs.writeFile(filepath, file.buffer);

    const url = `${baseUrl}/uploads/users/${userId}/gallery/${filename}`;
    const nextGallery = [...existingGallery, url];

    const updated = await this.usersRepository.update(userId, {
      gallery: nextGallery,
    });

    this.logger.log(
      `Gallery photo uploaded for user ${userId} (${nextGallery.length}/${MAX_GALLERY_ITEMS}): ${filename}`,
    );

    this.computeCompletionScore(userId).catch((err) =>
      this.logger.error(
        `Failed to recompute completion score for ${userId}: ${err.message}`,
      ),
    );

    return updated;
  }

  /**
   * Remove a gallery photo by URL. Best-effort deletes the underlying
   * file when it lives under this server's uploads/ tree; external URLs
   * leave only the DB row gone.
   */
  async removeGalleryPhoto(userId: string, url: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('url is required');
    }

    const existingGallery = Array.isArray(
      (user as { gallery?: string[] }).gallery,
    )
      ? (user as { gallery: string[] }).gallery
      : [];
    if (!existingGallery.includes(url)) {
      throw new NotFoundException('Photo not found in gallery');
    }

    const nextGallery = existingGallery.filter((u) => u !== url);
    const updated = await this.usersRepository.update(userId, {
      gallery: nextGallery,
    });

    // Filesystem cleanup — only for our own uploads tree, and only when
    // the URL includes the owner's userId (guards against poisoned URLs
    // targeting another user's directory).
    try {
      if (url.indexOf(`/uploads/users/${userId}/gallery/`) !== -1) {
        const filename = path.basename(url);
        const filepath = path.join(
          this.uploadsDir,
          userId,
          'gallery',
          filename,
        );
        await fs.unlink(filepath);
      }
    } catch {
      // Ignore — the DB row is already gone.
    }

    this.logger.log(`Gallery photo removed for user ${userId}: ${url}`);
    return updated;
  }

  /**
   * Compute profile completion score (0-100)
   *
   * Each field is worth 10 points. Updated in DB.
   */
  async computeCompletionScore(userId: string): Promise<number> {
    const user = await this.usersRepository.findCompletionFields(userId);

    if (!user) return 0;

    const weights = {
      firstName: 10,
      lastName: 10,
      email: 10,
      phone: 10,
      city: 10,
      bio: 10,
      pictureUrl: 10,
      category: 10,
      skills: 10,
      location: 10,
    };

    let score = 0;
    if (user.firstName?.trim()) score += weights.firstName;
    if (user.lastName?.trim()) score += weights.lastName;
    if (user.email) score += weights.email;
    if (user.phone?.trim()) score += weights.phone;
    if (user.city?.trim()) score += weights.city;
    if (user.bio?.trim()) score += weights.bio;
    if (user.pictureUrl) score += weights.pictureUrl;
    if (user.category?.trim()) score += weights.category;
    if (user.skills?.length > 0) score += weights.skills;
    if (user.latitude && user.longitude) score += weights.location;

    await this.usersRepository.updateCompletionScore(userId, score);

    return score;
  }

  /**
   * Compute and auto-update trust tier based on verifications
   *
   * BASIC → VERIFIED (phone) → TRUSTED (phone + ID) → PREMIUM (phone + ID + bank)
   */
  async recomputeTrustTier(userId: string): Promise<string> {
    const user = await this.usersRepository.findTrustTierFields(userId);

    if (!user) return 'BASIC';

    let newTier: 'BASIC' | 'VERIFIED' | 'TRUSTED' | 'PREMIUM' = 'BASIC';

    if (user.phoneVerified) newTier = 'VERIFIED';
    if (user.phoneVerified && user.idVerificationStatus === 'VERIFIED') newTier = 'TRUSTED';
    if (user.phoneVerified && user.idVerificationStatus === 'VERIFIED' && user.bankVerified) newTier = 'PREMIUM';

    if (newTier !== user.trustTier) {
      await this.usersRepository.updateTrustTier(userId, newTier);
      this.logger.log(`Trust tier updated for user ${userId}: ${user.trustTier} → ${newTier}`);
    }

    return newTier;
  }

  /**
   * Get completion details for the current user
   *
   * Returns score, tier, and list of missing fields.
   */
  async getCompletionDetails(userId: string): Promise<{
    score: number;
    tier: string;
    missingFields: string[];
  }> {
    const user = await this.usersRepository.findCompletionFields(userId);
    if (!user) throw new NotFoundException('User not found');

    const tierData = await this.usersRepository.findTrustTierFields(userId);
    const tier = tierData?.trustTier ?? 'BASIC';

    const score = await this.computeCompletionScore(userId);

    const missingFields: string[] = [];
    if (!user.firstName?.trim()) missingFields.push('firstName');
    if (!user.lastName?.trim()) missingFields.push('lastName');
    if (!user.email) missingFields.push('email');
    if (!user.phone?.trim()) missingFields.push('phone');
    if (!user.city?.trim()) missingFields.push('city');
    if (!user.bio?.trim()) missingFields.push('bio');
    if (!user.pictureUrl) missingFields.push('pictureUrl');
    if (!user.category?.trim()) missingFields.push('category');
    if (!(user.skills?.length > 0)) missingFields.push('skills');
    if (!user.latitude || !user.longitude) missingFields.push('location');

    return { score, tier, missingFields };
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


import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import * as bcrypt from 'bcryptjs';

/**
 * Users Service - Business logic for user management
 * 
 * Handles user CRUD operations, password hashing, validation
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12; // bcrypt salt rounds (production-ready)

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
   * Deactivate user account (soft delete)
   */
  async deactivate(id: string) {
    await this.findById(id); // Verify exists
    return this.usersRepository.deactivate(id);
  }
}


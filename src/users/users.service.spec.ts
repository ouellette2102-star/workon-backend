import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { LocalUserRole } from '@prisma/client';
import * as fs from 'fs/promises';
import * as bcrypt from 'bcryptjs';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    city: 'Paris',
    pictureUrl: null as string | null,
    role: LocalUserRole.worker,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updatePassword: jest.fn(),
            updatePictureUrl: jest.fn(),
            deactivate: jest.fn(),
            emailExists: jest.fn(),
            anonymizeAndDelete: jest.fn(),
            isDeleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
  });

  describe('deleteAccount', () => {
    it('should delete account successfully with mission stats', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.isDeleted.mockResolvedValue(false);
      repository.anonymizeAndDelete.mockResolvedValue({
        id: 'user_123',
        deletedAt: new Date(),
        cancelledMissionsCount: 2,
        unassignedMissionsCount: 1,
      });

      const result = await service.deleteAccount('user_123');

      expect(result.deleted).toBe(true);
      expect(result.cancelledMissionsCount).toBe(2);
      expect(result.unassignedMissionsCount).toBe(1);
      expect(repository.findById).toHaveBeenCalledWith('user_123');
      expect(repository.isDeleted).toHaveBeenCalledWith('user_123');
      expect(repository.anonymizeAndDelete).toHaveBeenCalledWith('user_123');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteAccount('unknown_user')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.anonymizeAndDelete).not.toHaveBeenCalled();
    });

    it('should be idempotent - return success for already deleted user', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        active: false,
      });
      repository.isDeleted.mockResolvedValue(true);

      const result = await service.deleteAccount('user_123');

      expect(result.deleted).toBe(true);
      expect(result.cancelledMissionsCount).toBe(0);
      expect(result.unassignedMissionsCount).toBe(0);
      expect(repository.anonymizeAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user for valid ID', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user_123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const result = await service.updateProfile('user_123', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('uploadPicture', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const baseUrl = 'http://localhost:3000';

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
    });

    it('should upload picture successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePictureUrl.mockResolvedValue({
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/profile_xxx.jpg',
      });

      const result = await service.uploadPicture('user_123', mockFile, baseUrl);

      expect(result.pictureUrl).toContain('/uploads/users/user_123/');
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(repository.updatePictureUrl).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no file provided', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(
        service.uploadPicture('user_123', null as any, baseUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const pdfFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(
        service.uploadPicture('user_123', pdfFile, baseUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB

      await expect(
        service.uploadPicture('user_123', largeFile, baseUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.uploadPicture('unknown', mockFile, baseUrl),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete old picture when uploading new one', async () => {
      const userWithPicture = {
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/old_profile.jpg',
      };
      repository.findById.mockResolvedValue(userWithPicture);
      repository.updatePictureUrl.mockResolvedValue({
        ...userWithPicture,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/profile_new.jpg',
      });

      await service.uploadPicture('user_123', mockFile, baseUrl);

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should accept PNG files', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePictureUrl.mockResolvedValue({
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/profile.png',
      });

      const pngFile = { ...mockFile, mimetype: 'image/png', originalname: 'test.png' };

      const result = await service.uploadPicture('user_123', pngFile, baseUrl);

      expect(result.pictureUrl).toBeDefined();
    });

    it('should accept WebP files', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePictureUrl.mockResolvedValue({
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/profile.webp',
      });

      const webpFile = { ...mockFile, mimetype: 'image/webp', originalname: 'test.webp' };

      const result = await service.uploadPicture('user_123', webpFile, baseUrl);

      expect(result.pictureUrl).toBeDefined();
    });

    it('should handle file without extension', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePictureUrl.mockResolvedValue({
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/profile.jpg',
      });

      const fileNoExt = { ...mockFile, originalname: 'test' };

      const result = await service.uploadPicture('user_123', fileNoExt, baseUrl);

      expect(result.pictureUrl).toBeDefined();
    });

    it('should ignore error when deleting non-existent old picture', async () => {
      const userWithPicture = {
        ...mockUser,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/old.jpg',
      };
      repository.findById.mockResolvedValue(userWithPicture);
      repository.updatePictureUrl.mockResolvedValue({
        ...userWithPicture,
        pictureUrl: 'http://localhost:3000/uploads/users/user_123/new.jpg',
      });
      mockFs.unlink.mockRejectedValue(new Error('ENOENT'));

      // Should not throw
      const result = await service.uploadPicture('user_123', mockFile, baseUrl);

      expect(result.pictureUrl).toBeDefined();
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create a new user successfully', async () => {
      repository.emailExists.mockResolvedValue(false);
      repository.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
      });

      const result = await service.create(createUserDto as any);

      expect(result.email).toBe(createUserDto.email);
      expect(repository.emailExists).toHaveBeenCalledWith(createUserDto.email);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      repository.emailExists.mockResolvedValue(true);

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      repository.emailExists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockUser);

      await service.create(createUserDto as any);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        12, // SALT_ROUNDS
      );
      expect(repository.create).toHaveBeenCalledWith(
        createUserDto,
        'hashed_password',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const userWithPassword = { ...mockUser, hashedPassword: 'hashed' };
      repository.findByEmail.mockResolvedValue(userWithPassword as any);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword('password', 'hashedPassword');

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return false for non-matching password', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword('wrong', 'hashedPassword');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePassword.mockResolvedValue({} as any);

      await service.updatePassword('user_123', 'newPassword');

      expect(repository.updatePassword).toHaveBeenCalledWith(
        'user_123',
        'hashed_password',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updatePassword('unknown', 'newPassword'),
      ).rejects.toThrow(NotFoundException);

      expect(repository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate user successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.deactivate.mockResolvedValue({ ...mockUser, active: false } as any);

      const result = await service.deactivate('user_123');

      expect(result.active).toBe(false);
      expect(repository.deactivate).toHaveBeenCalledWith('user_123');
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deactivate('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});


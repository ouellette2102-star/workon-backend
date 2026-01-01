import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { LocalUserRole } from '@prisma/client';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

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
    it('should delete account successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.isDeleted.mockResolvedValue(false);
      repository.anonymizeAndDelete.mockResolvedValue({
        id: 'user_123',
        deletedAt: new Date(),
      });

      await expect(service.deleteAccount('user_123')).resolves.not.toThrow();

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

      await expect(service.deleteAccount('user_123')).resolves.not.toThrow();

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
  });
});


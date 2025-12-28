import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { LocalUserRole } from '@prisma/client';

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
    role: LocalUserRole.worker,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
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
});


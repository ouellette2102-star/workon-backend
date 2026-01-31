import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProfileRole } from './dto/profile-response.dto';

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user_123',
    clerkId: 'clerk_abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    userProfile: {
      name: 'John Doe',
      phone: '+1234567890',
      city: 'Montreal',
      role: UserRole.WORKER,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user_123');

      expect(result.id).toBe('user_123');
      expect(result.fullName).toBe('John Doe');
      expect(result.phone).toBe('+1234567890');
      expect(result.city).toBe('Montreal');
      expect(result.primaryRole).toBe(ProfileRole.WORKER);
      expect(result.isWorker).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle user without profile', async () => {
      const userWithoutProfile = {
        ...mockUser,
        userProfile: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutProfile);

      const result = await service.getProfile('user_123');

      expect(result.fullName).toBe('');
      expect(result.phone).toBe('');
      expect(result.city).toBe('');
      expect(result.primaryRole).toBe(ProfileRole.WORKER);
    });

    it('should correctly identify employer role', async () => {
      const employerUser = {
        ...mockUser,
        userProfile: {
          ...mockUser.userProfile,
          role: UserRole.EMPLOYER,
        },
      };
      mockPrisma.user.findUnique.mockResolvedValue(employerUser);

      const result = await service.getProfile('user_123');

      expect(result.primaryRole).toBe(ProfileRole.EMPLOYER);
      expect(result.isEmployer).toBe(true);
      expect(result.isWorker).toBe(false);
    });

    it('should correctly identify admin role', async () => {
      const adminUser = {
        ...mockUser,
        userProfile: {
          ...mockUser.userProfile,
          role: UserRole.ADMIN,
        },
      };
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.getProfile('user_123');

      expect(result.primaryRole).toBe(ProfileRole.ADMIN);
      expect(result.isEmployer).toBe(true); // Admin is considered employer-like
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userProfile.findFirst.mockResolvedValue({
        id: 'profile_1',
        userId: 'user_123',
      });
      mockPrisma.userProfile.update.mockResolvedValue({});

      const updatedUser = {
        ...mockUser,
        userProfile: {
          ...mockUser.userProfile,
          name: 'Jane Doe',
          city: 'Toronto',
        },
      };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);

      const result = await service.updateProfile('user_123', {
        fullName: 'Jane Doe',
        city: 'Toronto',
      });

      expect(result.fullName).toBe('Jane Doe');
      expect(result.city).toBe('Toronto');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create profile if it does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userProfile.findFirst.mockResolvedValue(null);
      mockPrisma.userProfile.create.mockResolvedValue({});

      await service.updateProfile('user_123', {
        fullName: 'New User',
        phone: '+9876543210',
      });

      expect(mockPrisma.userProfile.create).toHaveBeenCalled();
    });

    it('should update role correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userProfile.findFirst.mockResolvedValue({
        id: 'profile_1',
        userId: 'user_123',
      });
      mockPrisma.userProfile.update.mockResolvedValue({});

      await service.updateProfile('user_123', {
        primaryRole: ProfileRole.EMPLOYER,
      });

      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.EMPLOYER,
          }),
        }),
      );
    });
  });
});

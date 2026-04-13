import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProfileService', () => {
  let service: ProfileService;

  const mockPrisma = {
    localUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLocalUser = {
    id: 'local_123',
    email: 'test@workon.ca',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '5145551234',
    city: 'Montreal',
    role: 'worker',
    pictureUrl: null,
    active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockLocalUser);

      const result = await service.getProfile('local_123');

      expect(result).toBeDefined();
      expect(result.id).toBe('local_123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should handle worker role', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockLocalUser);

      const result = await service.getProfile('local_123');

      expect(result).toBeDefined();
    });

    it('should handle employer role', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue({
        ...mockLocalUser,
        role: 'employer',
      });

      const result = await service.getProfile('local_123');

      expect(result).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockLocalUser);
      mockPrisma.localUser.update.mockResolvedValue(mockLocalUser);

      const result = await service.updateProfile('local_123', {
        fullName: 'Jean Dupont',
        phone: '5145559999',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.localUser.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('unknown', { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

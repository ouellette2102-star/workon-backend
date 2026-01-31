import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from './dto/create-user.dto';

describe('UsersRepository', () => {
  let repository: UsersRepository;

  const mockPrismaService = {
    localUser: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    localMission: {
      updateMany: jest.fn(),
    },
    localOffer: {
      deleteMany: jest.fn(),
    },
    emailOtp: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser = {
    id: 'local_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    city: 'Montreal',
    role: 'worker',
    active: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-30'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockPrismaService.localUser.create.mockResolvedValue(mockUser);

      const result = await repository.create(
        {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          city: 'Montreal',
          role: UserRole.WORKER,
          password: 'password123',
        },
        'hashed_password',
      );

      expect(result.email).toBe('test@example.com');
      expect(mockPrismaService.localUser.create).toHaveBeenCalled();
    });

    it('should handle missing optional fields', async () => {
      mockPrismaService.localUser.create.mockResolvedValue({
        ...mockUser,
        firstName: '',
        lastName: '',
      });

      const result = await repository.create(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        'hashed_password',
      );

      expect(result.email).toBe('test@example.com');
    });

    it('should throw error on duplicate email', async () => {
      const prismaError = new Error('Unique constraint violation') as any;
      prismaError.code = 'P2002';
      mockPrismaService.localUser.create.mockRejectedValue(prismaError);

      await expect(
        repository.create(
          { email: 'existing@example.com', password: 'pass' },
          'hash',
        ),
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email with hashed password', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        ...mockUser,
        hashedPassword: 'hashed_pass',
      });

      const result = await repository.findByEmail('test@example.com');

      expect(result?.email).toBe('test@example.com');
      expect(result?.hashedPassword).toBe('hashed_pass');
    });

    it('should return null if user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID without password', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('local_123');

      expect(result?.id).toBe('local_123');
      expect(result).not.toHaveProperty('hashedPassword');
    });

    it('should return null if user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const result = await repository.update('local_123', { firstName: 'Jane' });

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('updatePictureUrl', () => {
    it('should update profile picture URL', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({
        ...mockUser,
        pictureUrl: 'https://example.com/photo.jpg',
      });

      const result = await repository.updatePictureUrl(
        'local_123',
        'https://example.com/photo.jpg',
      );

      expect(result.pictureUrl).toBe('https://example.com/photo.jpg');
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockPrismaService.localUser.count.mockResolvedValue(1);

      const result = await repository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockPrismaService.localUser.count.mockResolvedValue(0);

      const result = await repository.emailExists('new@example.com');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockPrismaService.localUser.update.mockResolvedValue(mockUser);

      await repository.updatePassword('local_123', 'new_hashed_password');

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'local_123' },
          data: expect.objectContaining({ hashedPassword: 'new_hashed_password' }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('should soft delete (deactivate) user', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await repository.deactivate('local_123');

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'local_123' },
        data: { active: false },
      });
    });
  });

  describe('anonymizeAndDelete', () => {
    it('should perform GDPR-compliant deletion', async () => {
      const mockTx = {
        localMission: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        localOffer: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        emailOtp: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        localUser: {
          update: jest.fn().mockResolvedValue({
            id: 'local_123',
            deletedAt: new Date('2026-01-30'),
          }),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback: (tx: any) => Promise<any>) =>
        callback(mockTx),
      );

      const result = await repository.anonymizeAndDelete('local_123');

      expect(result.id).toBe('local_123');
      expect(result.deletedAt).toEqual(new Date('2026-01-30'));
      expect(result.cancelledMissionsCount).toBe(2);
      expect(result.unassignedMissionsCount).toBe(2);
    });
  });

  describe('isDeleted', () => {
    it('should return true if user is deleted', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        deletedAt: new Date(),
      });

      const result = await repository.isDeleted('local_123');

      expect(result).toBe(true);
    });

    it('should return false if user is not deleted', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        deletedAt: null,
      });

      const result = await repository.isDeleted('local_123');

      expect(result).toBe(false);
    });
  });
});

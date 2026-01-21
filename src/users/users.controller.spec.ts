import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalUserRole } from '@prisma/client';

const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
  city: 'Paris',
  pictureUrl: null,
  role: LocalUserRole.worker,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  findById: jest.fn(),
  updateProfile: jest.fn(),
  uploadPicture: jest.fn(),
  deleteAccount: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const mockReq = { user: { sub: 'user_123' } };
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockReq);

      expect(mockUsersService.findById).toHaveBeenCalledWith('user_123');
      expect(result).toBeDefined();
    });
  });

  describe('updateMe', () => {
    it('should update current user profile', async () => {
      const mockReq = { user: { sub: 'user_123' } };
      const updateDto = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, firstName: 'Updated' };

      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(mockReq, updateDto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user_123',
        updateDto,
      );
      expect(result).toBeDefined();
    });

    it('should update multiple fields', async () => {
      const mockReq = { user: { sub: 'user_123' } };
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        city: 'Montreal',
      };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(mockReq, updateDto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user_123',
        updateDto,
      );
      expect(result).toBeDefined();
    });
  });

  describe('uploadPicture', () => {
    it('should upload profile picture', async () => {
      const mockReq = {
        user: { sub: 'user_123' },
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.workon.com'),
      };
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image data'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const updatedUser = {
        ...mockUser,
        pictureUrl: 'https://api.workon.com/uploads/users/user_123/profile.jpg',
      };

      mockUsersService.uploadPicture.mockResolvedValue(updatedUser);

      const result = await controller.uploadPicture(mockReq, mockFile);

      expect(mockUsersService.uploadPicture).toHaveBeenCalledWith(
        'user_123',
        mockFile,
        'https://api.workon.com',
      );
      expect(result).toBeDefined();
    });

    it('should use http protocol when not specified', async () => {
      const mockReq = {
        user: { sub: 'user_123' },
        protocol: undefined,
        get: jest.fn().mockReturnValue(undefined),
      };
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image data'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockUsersService.uploadPicture.mockResolvedValue(mockUser);

      await controller.uploadPicture(mockReq, mockFile);

      expect(mockUsersService.uploadPicture).toHaveBeenCalledWith(
        'user_123',
        mockFile,
        'http://localhost:3000',
      );
    });
  });

  describe('deleteMe', () => {
    it('should delete current user account', async () => {
      const mockReq = { user: { sub: 'user_123' } };
      mockUsersService.deleteAccount.mockResolvedValue({
        deleted: true,
        cancelledMissionsCount: 0,
        unassignedMissionsCount: 0,
      });

      await controller.deleteMe(mockReq);

      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('user_123');
    });

    it('should return void (204 No Content)', async () => {
      const mockReq = { user: { sub: 'user_123' } };
      mockUsersService.deleteAccount.mockResolvedValue({
        deleted: true,
        cancelledMissionsCount: 2,
        unassignedMissionsCount: 1,
      });

      const result = await controller.deleteMe(mockReq);

      expect(result).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne('user_123');

      expect(mockUsersService.findById).toHaveBeenCalledWith('user_123');
      expect(result).toBeDefined();
    });

    it('should work with different user IDs', async () => {
      const otherUser = { ...mockUser, id: 'user_456' };
      mockUsersService.findById.mockResolvedValue(otherUser);

      const result = await controller.findOne('user_456');

      expect(mockUsersService.findById).toHaveBeenCalledWith('user_456');
      expect(result).toBeDefined();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: any;

  const mockProfile: any = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'worker',
    phone: '+15141234567',
    bio: 'Experienced worker',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      service.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockReq);

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
    });
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      service.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getMe(mockReq);

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      const updateDto = { bio: 'Updated bio' };
      service.updateProfile.mockResolvedValue({ ...mockProfile, bio: 'Updated bio' });

      const result = await controller.updateProfile(mockReq, updateDto as any);

      expect(service.updateProfile).toHaveBeenCalledWith('user-1', updateDto);
      expect(result).toBeDefined();
    });
  });
});

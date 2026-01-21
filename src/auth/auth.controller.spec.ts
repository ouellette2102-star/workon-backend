import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalUserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { LocalAuthService } from './local-auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let localAuthService: jest.Mocked<LocalAuthService>;
  let usersService: jest.Mocked<UsersService>;

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

  const mockAuthResponse = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    user: mockUser,
  };

  // Mock JwtAuthGuard to always pass
  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: LocalAuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            validateUser: jest.fn(),
            deleteAccount: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            verifyPassword: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    localAuthService = module.get(LocalAuthService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      localAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(localAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should propagate errors from auth service', async () => {
      localAuthService.register.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      localAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(localAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      localAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      localAuthService.validateUser.mockResolvedValue(mockUser);
      const mockRequest = { user: { sub: 'user_123' } };

      const result = await controller.getMe(mockRequest);

      expect(localAuthService.validateUser).toHaveBeenCalledWith('user_123');
      expect(result).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      const refreshResponse = {
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      };
      localAuthService.refreshTokens.mockResolvedValue(refreshResponse);

      const result = await controller.refresh({ refreshToken: 'valid.refresh.token' });

      expect(result).toEqual(refreshResponse);
      expect(localAuthService.refreshTokens).toHaveBeenCalledWith('valid.refresh.token');
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      localAuthService.refreshTokens.mockRejectedValue(new UnauthorizedException('Invalid token'));

      await expect(
        controller.refresh({ refreshToken: 'invalid.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message', async () => {
      const forgotResponse = { message: 'If this email exists, a reset link has been sent' };
      localAuthService.forgotPassword.mockResolvedValue(forgotResponse);

      const result = await controller.forgotPassword({ email: 'test@example.com' });

      expect(result).toEqual(forgotResponse);
      expect(localAuthService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetResponse = { message: 'Password has been reset successfully' };
      localAuthService.resetPassword.mockResolvedValue(resetResponse);

      const result = await controller.resetPassword({
        token: 'valid.reset.token',
        newPassword: 'NewPassword123!',
      });

      expect(result).toEqual(resetResponse);
      expect(localAuthService.resetPassword).toHaveBeenCalledWith(
        'valid.reset.token',
        'NewPassword123!',
      );
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LocalUserRole } from '@prisma/client';
import { LocalAuthService } from './local-auth.service';
import { UsersService } from '../users/users.service';

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    hashedPassword: '$2a$12$hashedpassword',
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalAuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            verifyPassword: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                NODE_ENV: 'development',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LocalAuthService>(LocalAuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.verifyPassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(usersService.verifyPassword).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, active: false });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens on valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user_123' });
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refreshTokens('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user_123' });
      usersService.findById.mockResolvedValue({ ...mockUser, active: false });

      await expect(service.refreshTokens('valid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toBe('If this email exists, a reset link has been sent');
      expect(result.resetToken).toBeDefined(); // DEV mode returns token
    });

    it('should return success message for non-existent email (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result.message).toBe('If this email exists, a reset link has been sent');
      expect(result.resetToken).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password on valid token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user_123',
        email: 'test@example.com',
        type: 'password-reset',
      });
      usersService.findById.mockResolvedValue(mockUser);
      usersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword('valid.token', 'newPassword123');

      expect(result.message).toBe('Password has been reset successfully');
      expect(usersService.updatePassword).toHaveBeenCalledWith('user_123', 'newPassword123');
    });

    it('should throw BadRequestException on invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.resetPassword('invalid.token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for wrong token type', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user_123',
        type: 'access', // Wrong type
      });

      await expect(
        service.resetPassword('wrong.type.token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid userId', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser('user_123');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findById.mockRejectedValue(new UnauthorizedException('User not found'));

      await expect(service.validateUser('unknown')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});


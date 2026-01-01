import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LocalAuthService } from './local-auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Logger, NotFoundException, ExecutionContext } from '@nestjs/common';

// Mock JwtAuthGuard to always allow requests
const mockJwtAuthGuard = {
  canActivate: jest.fn((context: ExecutionContext) => true),
};

describe('AuthController - Delete Account', () => {
  let controller: AuthController;
  let mockLocalAuthService: Partial<LocalAuthService>;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // Mock LocalAuthService
    mockLocalAuthService = {
      validateUser: jest.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }),
    };

    // Mock UsersService
    mockUsersService = {
      deleteAccount: jest.fn().mockResolvedValue({
        deleted: true,
        cancelledMissionsCount: 2,
        unassignedMissionsCount: 1,
      }),
    };

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /auth/account', () => {
    const mockRequest = { user: { sub: 'user-123' } };

    it('should successfully delete account with valid confirmation', async () => {
      const dto = { confirm: 'DELETE' };

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(true);
      expect(result.message).toContain('supprimé');
      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('user-123');
    });

    it('should reject deletion without confirmation', async () => {
      const dto = { confirm: 'delete' }; // lowercase - invalid

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('CONFIRM_REQUIRED');
      expect(mockUsersService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should reject deletion with wrong confirmation string', async () => {
      const dto = { confirm: 'SUPPRIMER' }; // wrong string

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('CONFIRM_REQUIRED');
      expect(mockUsersService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      const dto = { confirm: 'DELETE' };
      (mockUsersService.deleteAccount as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should handle generic errors gracefully', async () => {
      const dto = { confirm: 'DELETE' };
      (mockUsersService.deleteAccount as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('DELETION_FAILED');
    });

    it('should be idempotent for already deleted accounts', async () => {
      const dto = { confirm: 'DELETE' };
      (mockUsersService.deleteAccount as jest.Mock).mockResolvedValue({
        deleted: true,
        cancelledMissionsCount: 0,
        unassignedMissionsCount: 0,
      });

      const result = await controller.deleteAccount(dto, mockRequest);

      expect(result.ok).toBe(true);
      expect(result.message).toContain('supprimé');
    });
  });
});


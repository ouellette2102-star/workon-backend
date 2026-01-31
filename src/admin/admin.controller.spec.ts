import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CatalogService } from '../catalog/catalog.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminActionInterceptor } from '../auth/interceptors/admin-action.interceptor';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;
  let catalogService: jest.Mocked<CatalogService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAdminService = {
    reconcilePayments: jest.fn(),
  };

  const mockCatalogService = {
    seedCatalog: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock guard that always allows access
  const mockGuard = { canActivate: () => true };

  // Mock interceptor that does nothing
  const mockInterceptor = { intercept: (_context: unknown, next: { handle: () => unknown }) => next.handle() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .overrideInterceptor(AdminActionInterceptor)
      .useValue(mockInterceptor)
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
    catalogService = module.get(CatalogService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reconcilePayments', () => {
    it('should call adminService.reconcilePayments with user id', async () => {
      const mockReq = { user: { sub: 'admin-user-1' } };
      const mockResult = { checked: 5, updated: 2, errors: [] };
      mockAdminService.reconcilePayments.mockResolvedValue(mockResult);

      const result = await controller.reconcilePayments(mockReq);

      expect(result).toEqual(mockResult);
      expect(mockAdminService.reconcilePayments).toHaveBeenCalledWith('admin-user-1');
    });
  });

  describe('seedCatalog', () => {
    it('should allow access with valid admin secret', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockResult = {
        categories: { created: 5, updated: 0 },
        skills: { created: 10, updated: 0, skipped: 0 },
        timestamp: '2026-01-30T00:00:00.000Z',
      };
      mockCatalogService.seedCatalog.mockResolvedValue(mockResult);

      const result = await controller.seedCatalog('secret123', undefined);

      expect(result).toEqual(mockResult);
      expect(mockCatalogService.seedCatalog).toHaveBeenCalled();
    });

    it('should reject with wrong admin secret and no user', async () => {
      mockConfigService.get.mockReturnValue('secret123');

      await expect(
        controller.seedCatalog('wrong-secret', undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access with admin JWT', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockReq = { user: { role: UserRole.ADMIN } };
      const mockResult = {
        categories: { created: 0, updated: 5 },
        skills: { created: 0, updated: 10, skipped: 0 },
        timestamp: '2026-01-30T00:00:00.000Z',
      };
      mockCatalogService.seedCatalog.mockResolvedValue(mockResult);

      const result = await controller.seedCatalog(undefined, mockReq);

      expect(result).toEqual(mockResult);
    });

    it('should allow access with admin role string', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockReq = { user: { role: 'admin' } };
      mockCatalogService.seedCatalog.mockResolvedValue({} as any);

      await controller.seedCatalog(undefined, mockReq);

      expect(mockCatalogService.seedCatalog).toHaveBeenCalled();
    });

    it('should allow access with ADMIN role string', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockReq = { user: { role: 'ADMIN' } };
      mockCatalogService.seedCatalog.mockResolvedValue({} as any);

      await controller.seedCatalog(undefined, mockReq);

      expect(mockCatalogService.seedCatalog).toHaveBeenCalled();
    });

    it('should allow access with roles array containing ADMIN', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockReq = { user: { roles: ['ADMIN'] } };
      mockCatalogService.seedCatalog.mockResolvedValue({} as any);

      await controller.seedCatalog(undefined, mockReq);

      expect(mockCatalogService.seedCatalog).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      mockConfigService.get.mockReturnValue('secret123');
      const mockReq = { user: { role: 'worker' } };

      await expect(
        controller.seedCatalog(undefined, mockReq),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when no ADMIN_SECRET configured and no admin user', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const mockReq = { user: { role: 'worker' } };

      await expect(
        controller.seedCatalog('any-secret', mockReq),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

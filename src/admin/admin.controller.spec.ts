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

  // seedCatalog tests removed — method was moved out of AdminController
});

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: any;

  const mockCategory = {
    id: 'cat-1',
    name: 'Entretien',
    nameEn: 'Maintenance',
    icon: '🧹',
    legalNotes: null,
    residentialAllowed: true,
  };

  const mockSkill = {
    id: 'skill-1',
    name: 'Entretien résidentiel',
    nameEn: 'Residential Cleaning',
    categoryId: 'cat-1',
    requiresPermit: false,
    proofType: null,
  };

  beforeEach(async () => {
    const mockService = {
      getCategories: jest.fn(),
      getSkills: jest.fn(),
      getHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: mockService }],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      service.getCategories.mockResolvedValue([mockCategory]);

      const result = await controller.getCategories({});

      expect(service.getCategories).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Entretien');
    });

    it('should filter by includeResidential', async () => {
      service.getCategories.mockResolvedValue([mockCategory]);

      await controller.getCategories({ includeResidential: 'true' });

      expect(service.getCategories).toHaveBeenCalledWith({
        includeResidential: 'true',
      });
    });
  });

  describe('getSkills', () => {
    it('should return paginated skills', async () => {
      const paginatedResponse = {
        data: [mockSkill],
        meta: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
        },
      };
      service.getSkills.mockResolvedValue(paginatedResponse);

      const result = await controller.getSkills({});

      expect(service.getSkills).toHaveBeenCalledWith({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should pass filter parameters', async () => {
      const paginatedResponse = {
        data: [],
        meta: {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 0,
        },
      };
      service.getSkills.mockResolvedValue(paginatedResponse);

      const query = {
        categoryName: 'Entretien',
        requiresPermit: true,
        q: 'plomberie',
        page: 2,
        pageSize: 25,
        sort: 'name' as const,
        order: 'desc' as const,
      };

      await controller.getSkills(query);

      expect(service.getSkills).toHaveBeenCalledWith(query);
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const healthResponse = {
        categoriesCount: 10,
        skillsCount: 90,
        timestamp: new Date().toISOString(),
      };
      service.getHealth.mockResolvedValue(healthResponse);

      const result = await controller.getHealth();

      expect(service.getHealth).toHaveBeenCalled();
      expect(result.categoriesCount).toBe(10);
      expect(result.skillsCount).toBe(90);
    });
  });
});

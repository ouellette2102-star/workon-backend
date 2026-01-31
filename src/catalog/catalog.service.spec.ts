import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

describe('CatalogService', () => {
  let service: CatalogService;
  let prisma: PrismaService;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    skill: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Silence logger in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    const mockCategories = [
      {
        id: 'cat_1',
        name: 'Entretien',
        nameEn: 'Cleaning',
        icon: '🧹',
        legalNotes: null,
        residentialAllowed: true,
        createdAt: new Date(),
      },
      {
        id: 'cat_2',
        name: 'Jardinage',
        nameEn: 'Gardening',
        icon: '🌱',
        legalNotes: null,
        residentialAllowed: true,
        createdAt: new Date(),
      },
    ];

    it('should return all categories when no filter', async () => {
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories({});

      expect(result).toEqual(mockCategories);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
        select: expect.any(Object),
      });
    });

    it('should filter residential allowed categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategories[0]]);

      const result = await service.getCategories({ includeResidential: 'true' });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { residentialAllowed: true },
        orderBy: { name: 'asc' },
        select: expect.any(Object),
      });
    });

    it('should filter non-residential categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      await service.getCategories({ includeResidential: 'false' });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { residentialAllowed: false },
        orderBy: { name: 'asc' },
        select: expect.any(Object),
      });
    });
  });

  describe('getSkills', () => {
    const mockSkills = [
      {
        id: 'skill_1',
        name: 'Nettoyage général',
        nameEn: 'General cleaning',
        categoryId: 'cat_1',
        requiresPermit: false,
        proofType: null,
        createdAt: new Date(),
        category: {
          id: 'cat_1',
          name: 'Entretien',
          nameEn: 'Cleaning',
          icon: '🧹',
          residentialAllowed: true,
        },
      },
    ];

    it('should return paginated skills', async () => {
      mockPrisma.skill.count.mockResolvedValue(1);
      mockPrisma.skill.findMany.mockResolvedValue(mockSkills);

      const result = await service.getSkills({ page: 1, pageSize: 10 });

      expect(result.data).toEqual(mockSkills);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by category name', async () => {
      mockPrisma.skill.count.mockResolvedValue(1);
      mockPrisma.skill.findMany.mockResolvedValue(mockSkills);

      await service.getSkills({ categoryName: 'Entretien' });

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { name: 'Entretien' },
          }),
        }),
      );
    });

    it('should filter by requiresPermit', async () => {
      mockPrisma.skill.count.mockResolvedValue(0);
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await service.getSkills({ requiresPermit: true });

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requiresPermit: true,
          }),
        }),
      );
    });

    it('should search by query', async () => {
      mockPrisma.skill.count.mockResolvedValue(1);
      mockPrisma.skill.findMany.mockResolvedValue(mockSkills);

      await service.getSkills({ q: 'nettoyage' });

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'nettoyage', mode: 'insensitive' } },
              { nameEn: { contains: 'nettoyage', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should handle sorting', async () => {
      mockPrisma.skill.count.mockResolvedValue(1);
      mockPrisma.skill.findMany.mockResolvedValue(mockSkills);

      await service.getSkills({ sort: 'name', order: 'desc' });

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'desc' },
        }),
      );
    });
  });

  describe('getHealth', () => {
    it('should return catalog health status', async () => {
      mockPrisma.category.count.mockResolvedValue(10);
      mockPrisma.skill.count.mockResolvedValue(50);

      const result = await service.getHealth();

      expect(result.categoriesCount).toBe(10);
      expect(result.skillsCount).toBe(50);
      expect(result.timestamp).toBeDefined();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ProsService } from './pros.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

describe('ProsService', () => {
  let service: ProsService;

  const mockPrisma = {
    localUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProsService>(ProsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerPro', () => {
    const validDto = {
      firstName: 'Marc',
      lastName: 'Dubois',
      email: 'marc@test.com',
      phone: '514-555-9876',
      city: 'Montréal',
      category: 'paysagement',
      bio: 'Paysagiste pro depuis 10 ans',
    };

    it('should register a professional successfully', async () => {
      // No existing user
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null);
      // Slug check — available
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null);
      // Create
      mockPrisma.localUser.create.mockResolvedValue({
        id: 'pro_new',
        slug: 'marc-dubois-montreal',
        email: 'marc@test.com',
        completionScore: 100,
      });

      const result = await service.registerPro(validDto);

      expect(result.id).toBe('pro_new');
      expect(result.slug).toBe('marc-dubois-montreal');
      expect(result.profileUrl).toBe('/pro/marc-dubois-montreal');
      expect(mockPrisma.localUser.create).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValueOnce({
        id: 'existing',
        email: 'marc@test.com',
      });

      await expect(service.registerPro(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should generate unique slug with suffix on collision', async () => {
      // Email check — no existing
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null);
      // First slug check — taken
      mockPrisma.localUser.findUnique.mockResolvedValueOnce({ id: 'taken' });
      // Second slug check (with -2) — available
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null);
      // Create
      mockPrisma.localUser.create.mockResolvedValue({
        id: 'pro_new',
        slug: 'marc-dubois-montreal-2',
        email: 'marc@test.com',
      });

      const result = await service.registerPro(validDto);

      expect(result.slug).toBe('marc-dubois-montreal-2');
    });
  });

  describe('getProBySlug', () => {
    it('should return professional profile', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue({
        id: 'pro_123',
        firstName: 'Marc',
        lastName: 'Dubois',
        city: 'Montréal',
        bio: 'Paysagiste',
        category: 'paysagement',
        slug: 'marc-dubois-montreal',
        active: true,
        pictureUrl: null,
        serviceRadiusKm: 25,
        completionScore: 85,
        trustTier: 'BASIC',
        phoneVerified: false,
        createdAt: new Date('2026-01-01'),
        phone: '5145559876',
        email: 'marc@test.com',
      });
      mockPrisma.lead.count.mockResolvedValue(12);

      const result = await service.getProBySlug('marc-dubois-montreal');

      expect(result.fullName).toBe('Marc Dubois');
      expect(result.demandCount).toBe(12);
      expect(result.category).toBe('paysagement');
    });

    it('should throw if pro not found', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getProBySlug('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if pro is inactive', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue({
        id: 'pro_123',
        active: false,
      });

      await expect(
        service.getProBySlug('inactive-pro'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('slug generation', () => {
    it('should handle Quebec accents', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null); // email check
      mockPrisma.localUser.findUnique.mockResolvedValueOnce(null); // slug check
      mockPrisma.localUser.create.mockResolvedValue({
        id: 'pro_new',
        slug: 'rene-levesque-montreal',
        email: 'rene@test.com',
      });

      const result = await service.registerPro({
        firstName: 'René',
        lastName: 'Lévesque',
        email: 'rene@test.com',
        phone: '514-555-0000',
        city: 'Montréal',
        category: 'menage',
      });

      // The slug should have accents stripped
      expect(result.slug).toBe('rene-levesque-montreal');
    });
  });
});

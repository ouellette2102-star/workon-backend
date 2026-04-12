import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;

  const mockPrisma = {
    localUser: {
      findUnique: jest.fn(),
    },
    lead: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockPro = {
    id: 'pro_123',
    firstName: 'Marc',
    lastName: 'Dubois',
    email: 'marc@test.com',
    phone: '5145551234',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    const validDto = {
      clientName: 'Jean Tremblay',
      clientPhone: '514-555-1234',
      clientEmail: 'jean@test.com',
      serviceRequested: 'Entretien paysager',
      message: 'Besoin de tonte',
      professionalId: 'pro_123',
      source: 'facebook_ad',
    };

    it('should create a lead successfully', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockPro);
      mockPrisma.lead.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead_abc',
        ...validDto,
        phone: '5145551234',
        status: 'NEW',
        createdAt: new Date(),
      });

      const result = await service.createLead(validDto);

      expect(result.id).toBe('lead_abc');
      expect(result.professionalName).toBe('Marc Dubois');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '5145551234', // normalized
            email: 'jean@test.com',
            status: 'NEW',
          }),
        }),
      );
    });

    it('should reject invalid phone number (too short)', async () => {
      await expect(
        service.createLead({ ...validDto, clientPhone: '123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if professional not found', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(null);

      await expect(service.createLead(validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject duplicate lead (same phone + pro within 7 days)', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockPro);
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'existing_lead',
        createdAt: new Date(),
      });

      await expect(service.createLead(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should normalize phone by stripping non-digits', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(mockPro);
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead_xyz',
        status: 'NEW',
        createdAt: new Date(),
      });

      await service.createLead({
        ...validDto,
        clientPhone: '(514) 555-1234',
      });

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '5145551234',
          }),
        }),
      );
    });
  });

  describe('getLeadsByPro', () => {
    it('should return leads for a professional', async () => {
      const mockLeads = [
        { id: 'lead_1', name: 'Jean', status: 'NEW' },
        { id: 'lead_2', name: 'Marie', status: 'CONTACTED' },
      ];
      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.getLeadsByPro('pro_123');

      expect(result.leads).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);

      await service.getLeadsByPro('pro_123', 'NEW' as any);

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'pro_123', status: 'NEW' },
        }),
      );
    });
  });

  describe('getAllLeads', () => {
    it('should return paginated leads with total count', async () => {
      const mockLeads = [
        { id: 'lead_1', name: 'Jean', status: 'NEW', user: { firstName: 'Marc', lastName: 'Dubois', email: 'marc@test.com' } },
      ];
      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);
      mockPrisma.lead.count.mockResolvedValue(1);

      const result = await service.getAllLeads(undefined, 50, 0);

      expect(result.leads).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by status', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await service.getAllLeads('NEW' as any, 10, 0);

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'NEW' },
          take: 10,
          skip: 0,
        }),
      );
    });
  });

  describe('updateLeadStatus', () => {
    it('should update lead status', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead_1',
        status: 'NEW',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead_1',
        status: 'CONTACTED',
      });

      const result = await service.updateLeadStatus('lead_1', {
        status: 'CONTACTED' as any,
      });

      expect(result.status).toBe('CONTACTED');
    });

    it('should throw if lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLeadStatus('nonexistent', { status: 'CONTACTED' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

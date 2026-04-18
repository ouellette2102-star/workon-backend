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
      findMany: jest.fn(),
    },
    lead: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    leadDelivery: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    localMission: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((ops: any) => Promise.all(ops)),
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

    it('should degrade gracefully and return empty list on Prisma error', async () => {
      mockPrisma.lead.findMany.mockRejectedValue(
        Object.assign(new Error('schema drift'), { code: 'P2022' }),
      );

      const result = await service.getLeadsByPro('pro_999');

      expect(result).toEqual({ leads: [], total: 0 });
    });

    it('should reject missing proId', async () => {
      await expect(service.getLeadsByPro('' as any)).rejects.toThrow(
        /requis/,
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

  // ─── Phase 4 ──────────────────────────────────────────────────────

  describe('listDeliveredToUser', () => {
    it('returns deliveries + usage (FREE plan = limit 0)', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.leadDelivery.count.mockResolvedValue(0);
      mockPrisma.leadDelivery.findMany.mockResolvedValue([]);
      const res = await service.listDeliveredToUser('u1');
      expect(res.usage).toEqual({ used: 0, limit: 0 });
      expect(res.deliveries).toEqual([]);
    });

    it('returns limit=5 for CLIENT_PRO, null for CLIENT_BUSINESS', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: 'CLIENT_PRO' });
      mockPrisma.leadDelivery.count.mockResolvedValue(2);
      mockPrisma.leadDelivery.findMany.mockResolvedValue([]);
      let res = await service.listDeliveredToUser('u1');
      expect(res.usage).toEqual({ used: 2, limit: 5 });

      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: 'CLIENT_BUSINESS' });
      mockPrisma.leadDelivery.count.mockResolvedValue(42);
      res = await service.listDeliveredToUser('u1');
      expect(res.usage).toEqual({ used: 42, limit: null });
    });
  });

  describe('markOpened', () => {
    it('sets openedAt on delivery owned by user', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'u1',
        openedAt: null,
      });
      mockPrisma.leadDelivery.update.mockResolvedValue({});
      await service.markOpened('ld1', 'u1');
      expect(mockPrisma.leadDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ openedAt: expect.any(Date) }),
        }),
      );
    });

    it('is idempotent — skips if already opened', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'u1',
        openedAt: new Date(),
      });
      await service.markOpened('ld1', 'u1');
      expect(mockPrisma.leadDelivery.update).not.toHaveBeenCalled();
    });

    it('rejects when user is not the target', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'other',
        openedAt: null,
      });
      await expect(service.markOpened('ld1', 'u1')).rejects.toThrow(
        /Accès|Forbidden/i,
      );
    });
  });

  describe('acceptLead', () => {
    it('creates a mission from the lead + marks CONVERTED', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'u1',
        acceptedAt: null,
        declinedAt: null,
        lead: {
          id: 'lead1',
          name: 'Client Test',
          email: 'c@x.io',
          phone: '5145551111',
          category: 'cleaning',
          city: 'Montreal',
          description: 'Test',
          budgetCents: 5000,
          latitude: null,
          longitude: null,
          source: 'apollo',
        },
      });
      mockPrisma.localMission.create.mockResolvedValue({ id: 'lm_new' });
      mockPrisma.leadDelivery.update.mockResolvedValue({});
      mockPrisma.lead.update.mockResolvedValue({});

      const res = await service.acceptLead('ld1', 'u1');
      expect(res.mission.id).toBe('lm_new');
      expect(mockPrisma.localMission.create).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('throws 409 when already processed', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'u1',
        acceptedAt: new Date(),
        declinedAt: null,
        lead: { id: 'lead1' },
      });
      await expect(service.acceptLead('ld1', 'u1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('declineLead', () => {
    it('marks declinedAt', async () => {
      mockPrisma.leadDelivery.findUnique.mockResolvedValue({
        id: 'ld1',
        deliveredToUserId: 'u1',
        acceptedAt: null,
        declinedAt: null,
      });
      mockPrisma.leadDelivery.update.mockResolvedValue({});
      const res = await service.declineLead('ld1', 'u1');
      expect(res.ok).toBe(true);
    });
  });

  describe('dispatchLead', () => {
    it('creates LeadDelivery rows for matching candidates under quota', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead1',
        categoryId: 'cleaning',
        category: 'cleaning',
        city: 'Montreal',
      });
      mockPrisma.localUser.findMany.mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
      ]);
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: 'CLIENT_PRO' });
      mockPrisma.leadDelivery.count.mockResolvedValue(0);
      mockPrisma.leadDelivery.create.mockResolvedValue({});

      const res = await service.dispatchLead('lead1');
      expect(res.dispatched).toBe(2);
      expect(mockPrisma.leadDelivery.create).toHaveBeenCalledTimes(2);
    });

    it('skips candidates at quota', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead1',
        categoryId: null,
        category: null,
        city: 'Montreal',
      });
      mockPrisma.localUser.findMany.mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
      ]);
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: 'CLIENT_PRO' });
      mockPrisma.leadDelivery.count.mockResolvedValue(5); // at cap
      mockPrisma.leadDelivery.create.mockResolvedValue({});

      const res = await service.dispatchLead('lead1');
      expect(res.dispatched).toBe(0);
      expect(mockPrisma.leadDelivery.create).not.toHaveBeenCalled();
    });
  });
});

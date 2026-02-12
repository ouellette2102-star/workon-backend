import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { RequestContext } from '../common/middleware/request-context.middleware';
import { SupportTicketCategoryDto, SupportTicketPriorityDto } from './dto';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: PrismaService;

  const mockPrisma = {
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    supportTicketMessage: {
      create: jest.fn(),
    },
    trustAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockContext: RequestContext = {
    correlationId: 'corr-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    deviceIdHash: 'device-hash',
    language: 'fr',
    timezone: 'America/Toronto',
    currency: 'CAD',
    requestTime: new Date(),
  };

  const mockTicket = {
    id: 'ticket_123',
    userId: 'user_1',
    subject: 'Test Ticket',
    description: 'Test description',
    category: 'GENERAL',
    priority: 'NORMAL',
    status: 'OPEN',
    missionId: null,
    assignedTo: null,
    resolvedAt: null,
    deviceId: 'device-hash',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    prisma = module.get<PrismaService>(PrismaService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a support ticket successfully', async () => {
      mockPrisma.supportTicket.create.mockResolvedValue(mockTicket);
      mockPrisma.trustAuditLog.create.mockResolvedValue({});

      const result = await service.createTicket(
        'user_1',
        {
          subject: 'Test Ticket',
          description: 'Test description',
          category: SupportTicketCategoryDto.ACCOUNT,
        },
        mockContext,
      );

      expect(result.id).toBe('ticket_123');
      expect(result.subject).toBe('Test Ticket');
      expect(mockPrisma.supportTicket.create).toHaveBeenCalled();
    });

    it('should create ticket with priority', async () => {
      mockPrisma.supportTicket.create.mockResolvedValue({
        ...mockTicket,
        priority: 'HIGH',
      });
      mockPrisma.trustAuditLog.create.mockResolvedValue({});

      const result = await service.createTicket(
        'user_1',
        {
          subject: 'Urgent Ticket',
          description: 'Urgent issue',
          category: SupportTicketCategoryDto.PAYMENT,
          priority: SupportTicketPriorityDto.HIGH,
        },
        mockContext,
      );

      expect(result.priority).toBe('HIGH');
    });

    it('should create ticket with missionId', async () => {
      mockPrisma.supportTicket.create.mockResolvedValue({
        ...mockTicket,
        missionId: 'mission_123',
      });
      mockPrisma.trustAuditLog.create.mockResolvedValue({});

      const result = await service.createTicket(
        'user_1',
        {
          subject: 'Mission Issue',
          description: 'Problem with mission',
          category: SupportTicketCategoryDto.MISSION,
          missionId: 'mission_123',
        },
        mockContext,
      );

      expect(result.missionId).toBe('mission_123');
    });
  });

  describe('getUserTickets', () => {
    it('should return paginated user tickets', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.supportTicket.count.mockResolvedValue(1);

      const result = await service.getUserTickets('user_1', 1, 20);

      expect(result.tickets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return empty list when no tickets', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([]);
      mockPrisma.supportTicket.count.mockResolvedValue(0);

      const result = await service.getUserTickets('user_1');

      expect(result.tickets).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getTicketById', () => {
    it('should return ticket for owner', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket_123', 'user_1');

      expect(result.id).toBe('ticket_123');
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.getTicketById('nonexistent', 'user_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      await expect(
        service.getTicketById('ticket_123', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMessage', () => {
    it('should add message to ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.trustAuditLog.create.mockResolvedValue({});

      // Mock getTicketById return
      mockPrisma.supportTicket.findUnique
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce({ ...mockTicket, status: 'WAITING_ADMIN' });

      const result = await service.addMessage(
        'ticket_123',
        'user_1',
        { content: 'New message' },
        mockContext,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for closed ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      await expect(
        service.addMessage(
          'ticket_123',
          'user_1',
          { content: 'Message' },
          mockContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for resolved ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
      });

      await expect(
        service.addMessage(
          'ticket_123',
          'user_1',
          { content: 'Message' },
          mockContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('closeTicket', () => {
    it('should close ticket for owner', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });
      mockPrisma.trustAuditLog.create.mockResolvedValue({});

      // Need to mock second call for getTicketById
      mockPrisma.supportTicket.findUnique
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce({ ...mockTicket, status: 'CLOSED' });

      const result = await service.closeTicket('ticket_123', 'user_1', mockContext);

      expect(mockPrisma.supportTicket.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.closeTicket('nonexistent', 'user_1', mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      await expect(
        service.closeTicket('ticket_123', 'other_user', mockContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

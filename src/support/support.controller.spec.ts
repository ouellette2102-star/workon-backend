import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('SupportController', () => {
  let controller: SupportController;
  let service: any;

  const mockTicket: any = {
    id: 'ticket-1',
    userId: 'user-1',
    subject: 'Need help',
    category: 'GENERAL',
    priority: 'MEDIUM',
    status: 'OPEN',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReq = {
    user: { sub: 'user-1' },
    context: { deviceId: 'device-1', ip: '127.0.0.1' },
  };

  beforeEach(async () => {
    const mockService = {
      createTicket: jest.fn(),
      getUserTickets: jest.fn(),
      getTicketById: jest.fn(),
      addMessage: jest.fn(),
      closeTicket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupportController>(SupportController);
    service = module.get(SupportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a support ticket', async () => {
      const dto: any = {
        subject: 'Need help',
        category: 'GENERAL',
        message: 'I need help with...',
      };
      service.createTicket.mockResolvedValue(mockTicket);

      const result = await controller.createTicket(dto, mockReq);

      expect(service.createTicket).toHaveBeenCalledWith(
        'user-1',
        dto,
        mockReq.context,
      );
      expect(result).toBeDefined();
    });
  });

  describe('getMyTickets', () => {
    it('should return user tickets', async () => {
      const listResponse: any = {
        tickets: [mockTicket],
        total: 1,
        page: 1,
        totalPages: 1,
      };
      service.getUserTickets.mockResolvedValue(listResponse);

      const result = await controller.getMyTickets('1', '20', mockReq);

      expect(service.getUserTickets).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toBeDefined();
    });

    it('should use default pagination values', async () => {
      const listResponse: any = {
        tickets: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
      service.getUserTickets.mockResolvedValue(listResponse);

      await controller.getMyTickets(undefined, undefined, mockReq);

      expect(service.getUserTickets).toHaveBeenCalledWith('user-1', 1, 20);
    });
  });

  describe('getTicket', () => {
    it('should return ticket by id', async () => {
      service.getTicketById.mockResolvedValue(mockTicket);

      const result = await controller.getTicket('ticket-1', mockReq);

      expect(service.getTicketById).toHaveBeenCalledWith('ticket-1', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('addMessage', () => {
    it('should add message to ticket', async () => {
      const dto: any = { message: 'Follow-up message' };
      service.addMessage.mockResolvedValue({
        ...mockTicket,
        messages: [{ content: 'Follow-up message' }],
      });

      const result = await controller.addMessage('ticket-1', dto, mockReq);

      expect(service.addMessage).toHaveBeenCalledWith(
        'ticket-1',
        'user-1',
        dto,
        mockReq.context,
      );
      expect(result).toBeDefined();
    });
  });

  describe('closeTicket', () => {
    it('should close ticket', async () => {
      service.closeTicket.mockResolvedValue({ ...mockTicket, status: 'CLOSED' });

      const result = await controller.closeTicket('ticket-1', mockReq);

      expect(service.closeTicket).toHaveBeenCalledWith(
        'ticket-1',
        'user-1',
        mockReq.context,
      );
      expect(result).toBeDefined();
    });
  });
});

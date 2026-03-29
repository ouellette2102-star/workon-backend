import { Test, TestingModule } from '@nestjs/testing';
import { ProsService } from './pros.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed_password'),
}));

// Mock fetch for N8N webhook
global.fetch = jest.fn().mockResolvedValue({ ok: true });

describe('ProsService', () => {
  let service: ProsService;

  const mockTx = {
    localUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGhlSignup', () => {
    it('should return null id when email is missing', async () => {
      const result = await service.handleGhlSignup({ firstName: 'Jean' });

      expect(result).toEqual({ id: null });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create a new pro when email does not exist', async () => {
      mockTx.localUser.findUnique.mockResolvedValue(null);
      mockTx.localUser.create.mockResolvedValue({
        id: 'pro_test_123',
        email: 'jean@test.com',
      });

      const result = await service.handleGhlSignup({
        email: 'Jean@Test.com',
        firstName: 'Jean',
        lastName: 'Tremblay',
        phone: '514-555-0001',
        city: 'Montréal',
      });

      expect(result.id).toBe('pro_test_123');
      expect(mockTx.localUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'jean@test.com' },
      });
      expect(mockTx.localUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'jean@test.com',
            firstName: 'Jean',
            lastName: 'Tremblay',
            role: 'worker',
          }),
        }),
      );
    });

    it('should update existing pro with missing fields', async () => {
      mockTx.localUser.findUnique.mockResolvedValue({
        id: 'pro_existing',
        email: 'jean@test.com',
        firstName: 'Jean',
        lastName: '',
        phone: '',
        city: '',
      });
      mockTx.localUser.update.mockResolvedValue({
        id: 'pro_existing',
        email: 'jean@test.com',
      });

      const result = await service.handleGhlSignup({
        email: 'jean@test.com',
        lastName: 'Tremblay',
        city: 'Québec',
      });

      expect(result.id).toBe('pro_existing');
      expect(mockTx.localUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastName: 'Tremblay',
            city: 'Québec',
          }),
        }),
      );
    });

    it('should normalize email from contact sub-object', async () => {
      mockTx.localUser.findUnique.mockResolvedValue(null);
      mockTx.localUser.create.mockResolvedValue({
        id: 'pro_contact',
        email: 'contact@test.com',
      });

      await service.handleGhlSignup({
        contact: {
          email: ' Contact@Test.com ',
          firstName: 'Marie',
        },
      });

      expect(mockTx.localUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'contact@test.com' },
      });
    });
  });
});

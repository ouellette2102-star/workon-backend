import { Test, TestingModule } from '@nestjs/testing';
import { GhlService } from './ghl.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

describe('GhlService', () => {
  let service: GhlService;

  const mockTx = {
    localUser: {
      upsert: jest.fn(),
    },
    localMission: {
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    localMission: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  };

  const validDto = {
    title: 'Déneigement entrée',
    description: 'Besoin de déneiger',
    category: 'snow_removal',
    priceCents: 7500,
    latitude: 45.5017,
    longitude: -73.5673,
    city: 'Montréal',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GhlService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GhlService>(GhlService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMissionFromGhl', () => {
    it('should create a mission when no duplicate exists', async () => {
      mockPrisma.localMission.findFirst.mockResolvedValue(null);
      mockTx.localUser.upsert.mockResolvedValue({ id: 'system_ghl_bot' });
      mockTx.localMission.create.mockResolvedValue({ id: 'lm_ghl_test_123' });

      const result = await service.createMissionFromGhl(validDto);

      expect(result.duplicate).toBe(false);
      expect(result.missionId).toBe('lm_ghl_test_123');
      expect(result.status).toBe('open');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.localUser.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'system_ghl_bot' },
        }),
      );
      expect(mockTx.localMission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: validDto.title,
            priceCents: 7500,
            city: 'Montréal',
            status: 'open',
          }),
        }),
      );
    });

    it('should return duplicate when mission already exists within 1 hour', async () => {
      mockPrisma.localMission.findFirst.mockResolvedValue({
        id: 'lm_existing_123',
        title: validDto.title,
        city: validDto.city,
      });

      const result = await service.createMissionFromGhl(validDto);

      expect(result.duplicate).toBe(true);
      expect(result.missionId).toBe('lm_existing_123');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should include clientName and clientEmail in description when provided', async () => {
      mockPrisma.localMission.findFirst.mockResolvedValue(null);
      mockTx.localUser.upsert.mockResolvedValue({ id: 'system_ghl_bot' });
      mockTx.localMission.create.mockResolvedValue({ id: 'lm_ghl_test_456' });

      const dtoWithClient = {
        ...validDto,
        clientName: 'Jean Tremblay',
        clientEmail: 'jean@test.com',
      };

      await service.createMissionFromGhl(dtoWithClient);

      expect(mockTx.localMission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('Jean Tremblay'),
          }),
        }),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MissionsService } from './missions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';

const mockPrismaService = {
  employer: {
    findUnique: jest.fn(),
  },
  worker: {
    findUnique: jest.fn(),
  },
  mission: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('MissionsService', () => {
  let service: MissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMissionForEmployer', () => {
    it('crée une mission quand l’employeur est valide', async () => {
      const employerId = 'employer-1';
      const dto = {
        title: 'Test mission',
      };

      mockPrismaService.employer.findUnique.mockResolvedValue({ id: employerId });
      mockPrismaService.mission.create.mockResolvedValue({
        id: 'mission-1',
        title: dto.title,
        description: null,
        category: null,
        city: null,
        address: null,
        hourlyRate: null,
        startsAt: null,
        endsAt: null,
        status: MissionStatus.OPEN,
        createdAt: new Date(),
        employerId,
      });

      const result = await service.createMissionForEmployer('user-1', dto as any);

      expect(result).toHaveProperty('id', 'mission-1');
      expect(mockPrismaService.mission.create).toHaveBeenCalled();
    });

    it("rejette si l'utilisateur n'est pas employeur", async () => {
      mockPrismaService.employer.findUnique.mockResolvedValue(null);

      await expect(
        service.createMissionForEmployer('user-1', { title: 'Test' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAvailableMissionsForWorker', () => {
    it('retourne les missions ouvertes pour un worker', async () => {
      mockPrismaService.worker.findUnique.mockResolvedValue({ id: 'worker-1' });
      mockPrismaService.mission.findMany.mockResolvedValue([
        {
          id: 'mission-1',
          title: 'Mission',
          description: null,
          category: null,
          city: null,
          address: null,
          hourlyRate: null,
          startsAt: null,
          endsAt: null,
          status: MissionStatus.OPEN,
          createdAt: new Date(),
          employerId: 'emp-1',
        },
      ]);

      const missions = await service.getAvailableMissionsForWorker('user-1', {});

      expect(missions).toHaveLength(1);
      expect(mockPrismaService.mission.findMany).toHaveBeenCalled();
    });

    it("rejette l'accès aux non-workers", async () => {
      mockPrismaService.worker.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailableMissionsForWorker('user-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMissionStatus', () => {
    it('met à jour le statut si la mission appartient à employeur', async () => {
      mockPrismaService.employer.findUnique.mockResolvedValue({ id: 'emp-1' });
      const record = {
        id: 'mission-1',
        title: 'Mission',
        description: null,
        category: null,
        city: null,
        address: null,
        hourlyRate: null,
        startsAt: null,
        endsAt: null,
        status: MissionStatus.OPEN,
        createdAt: new Date(),
        employerId: 'emp-1',
      };
      mockPrismaService.mission.findUnique.mockResolvedValue(record);
      mockPrismaService.mission.update.mockResolvedValue({
        ...record,
        status: MissionStatus.COMPLETED,
      });

      const result = await service.updateMissionStatus('user-1', 'mission-1', {
        status: MissionStatus.COMPLETED,
      });

      expect(result.status).toBe(MissionStatus.COMPLETED);
    });

    it("rejette si la mission n'appartient pas à l'employeur", async () => {
      mockPrismaService.employer.findUnique.mockResolvedValue({ id: 'emp-1' });
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-1',
        title: '',
        description: null,
        category: null,
        city: null,
        address: null,
        hourlyRate: null,
        startsAt: null,
        endsAt: null,
        status: MissionStatus.OPEN,
        createdAt: new Date(),
        employerId: 'other',
      });

      await expect(
        service.updateMissionStatus('user-1', 'mission-1', {
          status: MissionStatus.COMPLETED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});


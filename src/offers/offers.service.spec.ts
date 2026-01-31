import { Test, TestingModule } from '@nestjs/testing';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LocalOfferStatus } from '@prisma/client';

describe('OffersService', () => {
  let service: OffersService;

  const mockPrismaService: any = {
    localMission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    localOffer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  
  // Setup $transaction to work correctly
  mockPrismaService.$transaction = jest.fn((callback: (tx: any) => Promise<any>) => callback(mockPrismaService));

  const mockMission = {
    id: 'mission_1',
    title: 'Test Mission',
    status: 'open',
    createdByUserId: 'employer_1',
  };

  const mockOffer = {
    id: 'offer_1',
    missionId: 'mission_1',
    workerId: 'worker_1',
    price: 100,
    message: 'I can help',
    status: LocalOfferStatus.PENDING,
    createdAt: new Date('2026-01-30'),
    updatedAt: new Date('2026-01-30'),
    worker: {
      id: 'worker_1',
      firstName: 'John',
      lastName: 'Doe',
      city: 'Montreal',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  describe('create', () => {
    it('should create an offer successfully', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.localOffer.findUnique.mockResolvedValue(null);
      mockPrismaService.localOffer.create.mockResolvedValue(mockOffer);

      const result = await service.create('worker_1', {
        missionId: 'mission_1',
        price: 100,
        message: 'I can help',
      });

      expect(result.id).toBe('offer_1');
      expect(result.price).toBe(100);
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(null);

      await expect(
        service.create('worker_1', { missionId: 'nonexistent', price: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if offering on own mission', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue({
        ...mockMission,
        createdByUserId: 'worker_1',
      });

      await expect(
        service.create('worker_1', { missionId: 'mission_1', price: 100 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if mission is not open', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'completed',
      });

      await expect(
        service.create('worker_1', { missionId: 'mission_1', price: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if worker already made an offer', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.localOffer.findUnique.mockResolvedValue(mockOffer);

      await expect(
        service.create('worker_1', { missionId: 'mission_1', price: 100 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByMission', () => {
    it('should return all offers for a mission', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.localOffer.findMany.mockResolvedValue([mockOffer]);

      const result = await service.findByMission('mission_1', 'employer_1');

      expect(result).toHaveLength(1);
      expect(result[0].workerId).toBe('worker_1');
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(null);

      await expect(
        service.findByMission('nonexistent', 'employer_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    const offerWithMission = {
      ...mockOffer,
      mission: mockMission,
    };

    it('should accept an offer and update mission', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(offerWithMission);
      mockPrismaService.localOffer.update.mockResolvedValue({
        ...mockOffer,
        status: LocalOfferStatus.ACCEPTED,
      });
      mockPrismaService.localOffer.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.localMission.findUnique = jest.fn().mockResolvedValue({
        ...mockMission,
        status: 'in_progress',
      });

      const result = await service.accept('offer_1', 'employer_1');

      expect(result.status).toBe(LocalOfferStatus.ACCEPTED);
    });

    it('should throw NotFoundException if offer not found', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(null);

      await expect(service.accept('nonexistent', 'employer_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not mission owner', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue({
        ...offerWithMission,
        mission: { ...mockMission, createdByUserId: 'other_employer' },
      });

      await expect(service.accept('offer_1', 'employer_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if offer already accepted', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue({
        ...offerWithMission,
        status: LocalOfferStatus.ACCEPTED,
      });

      await expect(service.accept('offer_1', 'employer_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if mission not open', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue({
        ...offerWithMission,
        mission: { ...mockMission, status: 'completed' },
      });

      await expect(service.accept('offer_1', 'employer_1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('should return offer by id', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(mockOffer);

      const result = await service.findById('offer_1');

      expect(result.id).toBe('offer_1');
    });

    it('should throw NotFoundException if offer not found', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByWorker', () => {
    it('should return all offers made by a worker', async () => {
      const offerWithMissionDetails = {
        ...mockOffer,
        mission: {
          id: 'mission_1',
          title: 'Test Mission',
          description: 'Description',
          category: 'cleaning',
          price: 100,
          city: 'Montreal',
          status: 'open',
          createdAt: new Date(),
        },
      };
      mockPrismaService.localOffer.findMany.mockResolvedValue([
        offerWithMissionDetails,
      ]);

      const result = await service.findByWorker('worker_1');

      expect(result).toHaveLength(1);
      expect(result[0].mission.title).toBe('Test Mission');
    });
  });

  describe('reject', () => {
    const offerWithMission = {
      ...mockOffer,
      mission: mockMission,
    };

    it('should reject a pending offer', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(offerWithMission);
      mockPrismaService.localOffer.update.mockResolvedValue({
        ...mockOffer,
        status: LocalOfferStatus.DECLINED,
      });

      const result = await service.reject('offer_1', 'employer_1');

      expect(result.status).toBe(LocalOfferStatus.DECLINED);
    });

    it('should throw NotFoundException if offer not found', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue(null);

      await expect(service.reject('nonexistent', 'employer_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not mission owner', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue({
        ...offerWithMission,
        mission: { ...mockMission, createdByUserId: 'other_employer' },
      });

      await expect(service.reject('offer_1', 'employer_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if offer not pending', async () => {
      mockPrismaService.localOffer.findUnique.mockResolvedValue({
        ...offerWithMission,
        status: LocalOfferStatus.ACCEPTED,
      });

      await expect(service.reject('offer_1', 'employer_1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

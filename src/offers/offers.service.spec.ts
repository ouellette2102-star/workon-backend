import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalOfferStatus } from '@prisma/client';

describe('OffersService', () => {
  let service: OffersService;
  let prisma: {
    localMission: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    localOffer: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockMission = {
    id: 'mission_123',
    title: 'Test Mission',
    status: 'open',
    createdByUserId: 'employer_123',
  };

  const mockOffer = {
    id: 'offer_123',
    missionId: 'mission_123',
    workerId: 'worker_123',
    price: 100,
    message: 'I can do this!',
    status: LocalOfferStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    worker: {
      id: 'worker_123',
      firstName: 'John',
      lastName: 'Doe',
      city: 'Paris',
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create an offer successfully', async () => {
      prisma.localMission.findUnique.mockResolvedValue(mockMission);
      prisma.localOffer.findUnique.mockResolvedValue(null);
      prisma.localOffer.create.mockResolvedValue(mockOffer);

      const result = await service.create('worker_123', {
        missionId: 'mission_123',
        price: 100,
        message: 'I can do this!',
      });

      expect(result).toHaveProperty('id');
      expect(prisma.localOffer.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      prisma.localMission.findUnique.mockResolvedValue(null);

      await expect(
        service.create('worker_123', {
          missionId: 'non_existent',
          price: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when offering on own mission', async () => {
      prisma.localMission.findUnique.mockResolvedValue({
        ...mockMission,
        createdByUserId: 'worker_123', // Same as worker
      });

      await expect(
        service.create('worker_123', {
          missionId: 'mission_123',
          price: 100,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-open mission', async () => {
      prisma.localMission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'in_progress',
      });

      await expect(
        service.create('worker_123', {
          missionId: 'mission_123',
          price: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate offer', async () => {
      prisma.localMission.findUnique.mockResolvedValue(mockMission);
      prisma.localOffer.findUnique.mockResolvedValue(mockOffer);

      await expect(
        service.create('worker_123', {
          missionId: 'mission_123',
          price: 100,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByMission', () => {
    it('should return offers for a mission', async () => {
      prisma.localMission.findUnique.mockResolvedValue(mockMission);
      prisma.localOffer.findMany.mockResolvedValue([mockOffer]);

      const result = await service.findByMission('mission_123', 'employer_123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('offer_123');
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      prisma.localMission.findUnique.mockResolvedValue(null);

      await expect(
        service.findByMission('non_existent', 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    const mockOfferWithMission = {
      ...mockOffer,
      mission: {
        id: 'mission_123',
        createdByUserId: 'employer_123',
        status: 'open',
      },
    };

    it('should accept offer successfully', async () => {
      prisma.localOffer.findUnique.mockResolvedValue(mockOfferWithMission);
      prisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          localOffer: {
            update: jest.fn().mockResolvedValue({
              ...mockOffer,
              status: LocalOfferStatus.ACCEPTED,
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          localMission: {
            update: jest.fn().mockResolvedValue(mockMission),
          },
        });
      });

      const result = await service.accept('offer_123', 'employer_123');

      expect(result.status).toBe(LocalOfferStatus.ACCEPTED);
    });

    it('should throw NotFoundException for non-existent offer', async () => {
      prisma.localOffer.findUnique.mockResolvedValue(null);

      await expect(service.accept('non_existent', 'employer_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not mission owner', async () => {
      prisma.localOffer.findUnique.mockResolvedValue(mockOfferWithMission);

      await expect(service.accept('offer_123', 'other_user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for already accepted offer', async () => {
      prisma.localOffer.findUnique.mockResolvedValue({
        ...mockOfferWithMission,
        status: LocalOfferStatus.ACCEPTED,
      });

      await expect(service.accept('offer_123', 'employer_123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for closed mission', async () => {
      prisma.localOffer.findUnique.mockResolvedValue({
        ...mockOfferWithMission,
        mission: { ...mockOfferWithMission.mission, status: 'completed' },
      });

      await expect(service.accept('offer_123', 'employer_123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

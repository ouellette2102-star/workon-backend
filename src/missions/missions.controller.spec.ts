import { Test, TestingModule } from '@nestjs/testing';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsentGuard } from '../compliance/guards/consent.guard';
import { MissionStatus } from '@prisma/client';

const mockMissionsService = {
  createMissionForEmployer: jest.fn(),
  getMissionsForEmployer: jest.fn(),
  getMissionsForWorker: jest.fn(),
  getAvailableMissionsForWorker: jest.fn(),
  getMissionFeed: jest.fn(),
  getMissionById: jest.fn(),
  reserveMission: jest.fn(),
  updateMissionStatus: jest.fn(),
};

describe('MissionsController', () => {
  let controller: MissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsController],
      providers: [
        { provide: MissionsService, useValue: mockMissionsService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MissionsController>(MissionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMission', () => {
    it('should create a mission for employer', async () => {
      const mockReq = { user: { sub: 'user-1' } };
      const dto = { title: 'Test Mission' };
      const expectedResult = {
        id: 'mission-1',
        title: 'Test Mission',
        status: MissionStatus.OPEN,
      };

      mockMissionsService.createMissionForEmployer.mockResolvedValue(expectedResult);

      const result = await controller.createMission(mockReq, dto as any);

      expect(mockMissionsService.createMissionForEmployer).toHaveBeenCalledWith(
        'user-1',
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('listEmployerMissions', () => {
    it('should return employer missions', async () => {
      const mockReq = { user: { sub: 'employer-1' } };
      const expectedResult = [
        { id: 'mission-1', title: 'Mission 1' },
        { id: 'mission-2', title: 'Mission 2' },
      ];

      mockMissionsService.getMissionsForEmployer.mockResolvedValue(expectedResult);

      const result = await controller.listEmployerMissions(mockReq);

      expect(mockMissionsService.getMissionsForEmployer).toHaveBeenCalledWith(
        'employer-1',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('listWorkerMissions', () => {
    it('should return worker missions', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const expectedResult = [{ id: 'mission-1', title: 'Assigned Mission' }];

      mockMissionsService.getMissionsForWorker.mockResolvedValue(expectedResult);

      const result = await controller.listWorkerMissions(mockReq);

      expect(mockMissionsService.getMissionsForWorker).toHaveBeenCalledWith(
        'worker-1',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('listAvailableMissions', () => {
    it('should return available missions with filters', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const filters = { city: 'Montreal', category: 'Cleaning' };
      const expectedResult = [{ id: 'mission-1', title: 'Available Mission' }];

      mockMissionsService.getAvailableMissionsForWorker.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.listAvailableMissions(mockReq, filters as any);

      expect(mockMissionsService.getAvailableMissionsForWorker).toHaveBeenCalledWith(
        'worker-1',
        filters,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMissionFeed', () => {
    it('should return mission feed with filters', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const filters = { latitude: 45.5, longitude: -73.5 };
      const expectedResult = [
        { id: 'mission-1', title: 'Feed Mission', distance: 2.5 },
      ];

      mockMissionsService.getMissionFeed.mockResolvedValue(expectedResult);

      const result = await controller.getMissionFeed(mockReq, filters as any);

      expect(mockMissionsService.getMissionFeed).toHaveBeenCalledWith(
        'worker-1',
        filters,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMissionById', () => {
    it('should return a specific mission', async () => {
      const mockReq = { user: { sub: 'user-1' } };
      const missionId = 'mission-1';
      const expectedResult = {
        id: missionId,
        title: 'Test Mission',
        status: MissionStatus.OPEN,
      };

      mockMissionsService.getMissionById.mockResolvedValue(expectedResult);

      const result = await controller.getMissionById(mockReq, missionId);

      expect(mockMissionsService.getMissionById).toHaveBeenCalledWith(
        'user-1',
        missionId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('reserveMission', () => {
    it('should reserve a mission for worker', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const missionId = 'mission-1';
      const expectedResult = {
        id: missionId,
        status: MissionStatus.MATCHED,
        assigneeWorkerId: 'worker-1',
      };

      mockMissionsService.reserveMission.mockResolvedValue(expectedResult);

      const result = await controller.reserveMission(mockReq, missionId);

      expect(mockMissionsService.reserveMission).toHaveBeenCalledWith(
        'worker-1',
        missionId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateStatus', () => {
    it('should update mission status', async () => {
      const mockReq = { user: { sub: 'employer-1' } };
      const missionId = 'mission-1';
      const dto = { status: MissionStatus.CANCELLED };
      const expectedResult = {
        id: missionId,
        status: MissionStatus.CANCELLED,
      };

      mockMissionsService.updateMissionStatus.mockResolvedValue(expectedResult);

      const result = await controller.updateStatus(mockReq, missionId, dto);

      expect(mockMissionsService.updateMissionStatus).toHaveBeenCalledWith(
        'employer-1',
        missionId,
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});


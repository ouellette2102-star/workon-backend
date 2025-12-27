import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MissionsLocalService } from './missions-local.service';
import { MissionsLocalRepository } from './missions-local.repository';
import { MissionsMapQueryDto } from './dto/missions-map-query.dto';

describe('MissionsLocalService - Map Endpoint', () => {
  let service: MissionsLocalService;
  let repository: MissionsLocalRepository;

  const mockRepository = {
    findByBbox: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findNearby: jest.fn(),
    updateStatus: jest.fn(),
    findByCreator: jest.fn(),
    findByWorker: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsLocalService,
        {
          provide: MissionsLocalRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MissionsLocalService>(MissionsLocalService);
    repository = module.get<MissionsLocalRepository>(MissionsLocalRepository);

    jest.clearAllMocks();
  });

  describe('findByBbox', () => {
    it('should return missions within valid bbox', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
        status: 'open',
        limit: 200,
      };

      const mockMissions = [
        {
          id: 'lm_1',
          title: 'Test Mission 1',
          category: 'plumbing',
          latitude: 45.50,
          longitude: -73.6,
          status: 'open',
          price: 100,
          city: 'Montreal',
          createdAt: new Date(),
        },
        {
          id: 'lm_2',
          title: 'Test Mission 2',
          category: 'electrical',
          latitude: 45.48,
          longitude: -73.55,
          status: 'open',
          price: 150,
          city: 'Montreal',
          createdAt: new Date(),
        },
      ];

      mockRepository.findByBbox.mockResolvedValue(mockMissions);

      // Act
      const result = await service.findByBbox(query);

      // Assert
      expect(result.missions).toEqual(mockMissions);
      expect(result.count).toBe(2);
      expect(result.bbox).toEqual({
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
      });
      expect(mockRepository.findByBbox).toHaveBeenCalledWith(
        45.55,
        45.45,
        -73.5,
        -73.7,
        'open',
        undefined,
        200,
      );
    });

    it('should throw BadRequestException for invalid bbox (north <= south)', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.45, // Invalid: north should be > south
        south: 45.55,
        east: -73.5,
        west: -73.7,
        status: 'open',
        limit: 200,
      };

      // Act & Assert
      await expect(service.findByBbox(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findByBbox(query)).rejects.toThrow(
        'Invalid bounding box: north must be greater than south',
      );
    });

    it('should throw BadRequestException for invalid bbox (east <= west)', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.55,
        south: 45.45,
        east: -73.7, // Invalid: east should be > west
        west: -73.5,
        status: 'open',
        limit: 200,
      };

      // Act & Assert
      await expect(service.findByBbox(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findByBbox(query)).rejects.toThrow(
        'Invalid bounding box: east must be greater than west',
      );
    });

    it('should return empty array for bbox with no missions', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
        status: 'open',
        limit: 200,
      };

      mockRepository.findByBbox.mockResolvedValue([]);

      // Act
      const result = await service.findByBbox(query);

      // Assert
      expect(result.missions).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
        status: 'open',
        category: 'plumbing',
        limit: 200,
      };

      mockRepository.findByBbox.mockResolvedValue([]);

      // Act
      await service.findByBbox(query);

      // Assert
      expect(mockRepository.findByBbox).toHaveBeenCalledWith(
        45.55,
        45.45,
        -73.5,
        -73.7,
        'open',
        'plumbing',
        200,
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      const query: MissionsMapQueryDto = {
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
        status: 'open',
        limit: 50,
      };

      mockRepository.findByBbox.mockResolvedValue([]);

      // Act
      await service.findByBbox(query);

      // Assert
      expect(mockRepository.findByBbox).toHaveBeenCalledWith(
        45.55,
        45.45,
        -73.5,
        -73.7,
        'open',
        undefined,
        50,
      );
    });
  });
});


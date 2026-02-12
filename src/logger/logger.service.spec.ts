import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

describe('LoggerService', () => {
  let service: LoggerService;

  const mockWinstonLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockWinstonLogger },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should call winston log method', () => {
      service.log('Test message', 'TestContext');

      expect(mockWinstonLogger.log).toHaveBeenCalledWith('Test message', 'TestContext');
    });

    it('should handle missing context', () => {
      service.log('Test message');

      expect(mockWinstonLogger.log).toHaveBeenCalledWith('Test message', undefined);
    });
  });

  describe('error', () => {
    it('should call winston error method', () => {
      service.error('Error message', 'Error trace', 'TestContext');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Error message',
        'Error trace',
        'TestContext',
      );
    });

    it('should handle missing trace and context', () => {
      service.error('Error message');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Error message',
        undefined,
        undefined,
      );
    });
  });

  describe('warn', () => {
    it('should call winston warn method', () => {
      service.warn('Warning message', 'TestContext');

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Warning message', 'TestContext');
    });
  });

  describe('debug', () => {
    it('should call winston debug method', () => {
      service.debug('Debug message', 'TestContext');

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug message', 'TestContext');
    });
  });

  describe('verbose', () => {
    it('should call winston verbose method', () => {
      service.verbose('Verbose message', 'TestContext');

      expect(mockWinstonLogger.verbose).toHaveBeenCalledWith('Verbose message', 'TestContext');
    });
  });

  describe('null safety', () => {
    it('should handle null logger gracefully', async () => {
      const moduleWithNullLogger: TestingModule = await Test.createTestingModule({
        providers: [
          LoggerService,
          { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: null },
        ],
      }).compile();

      const serviceWithNull = moduleWithNullLogger.get<LoggerService>(LoggerService);

      // These should not throw
      expect(() => serviceWithNull.log('Test')).not.toThrow();
      expect(() => serviceWithNull.error('Test')).not.toThrow();
      expect(() => serviceWithNull.warn('Test')).not.toThrow();
      expect(() => serviceWithNull.debug('Test')).not.toThrow();
      expect(() => serviceWithNull.verbose('Test')).not.toThrow();
    });
  });
});

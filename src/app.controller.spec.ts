import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return API info', () => {
      const result = controller.getHello();

      expect(result).toEqual({
        message: 'WorkOn Backend API',
        version: '1.0.0',
      });
    });
  });
});

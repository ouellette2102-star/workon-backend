import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  getHello(): { message: string; version: string } {
    return {
      message: 'WorkOn Backend API',
      version: '1.0.0',
    };
  }
}


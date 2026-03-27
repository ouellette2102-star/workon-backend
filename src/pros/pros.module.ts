import { Module } from '@nestjs/common';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProsController],
  providers: [ProsService],
})
export class ProsModule {}

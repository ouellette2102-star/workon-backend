import { Module } from '@nestjs/common';
import { MissionsMapController } from './missions-map.controller';
import { MissionsMapService } from './missions-map.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MissionsMapController],
  providers: [MissionsMapService],
  exports: [MissionsMapService],
})
export class MissionsMapModule {}


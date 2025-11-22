import { Module, forwardRef } from '@nestjs/common';
import { MissionPhotosController } from './mission-photos.controller';
import { MissionPhotosService } from './mission-photos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [MissionPhotosController],
  providers: [MissionPhotosService],
  exports: [MissionPhotosService],
})
export class MissionPhotosModule {}


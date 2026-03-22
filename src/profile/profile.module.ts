import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProfileController, WorkersController],
  providers: [ProfileService, WorkersService],
  exports: [WorkersService],
})
export class ProfileModule {}


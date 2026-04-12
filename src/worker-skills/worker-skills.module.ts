import { Module } from '@nestjs/common';
import { WorkerSkillsController } from './worker-skills.controller';
import { WorkerSkillsService } from './worker-skills.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkerSkillsController],
  providers: [WorkerSkillsService],
  exports: [WorkerSkillsService],
})
export class WorkerSkillsModule {}

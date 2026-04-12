import { Module } from '@nestjs/common';
import { WorkerSkillsController } from './worker-skills.controller';
import { WorkerSkillsService } from './worker-skills.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkerSkillsController],
  providers: [WorkerSkillsService],
  exports: [WorkerSkillsService],
})
export class WorkerSkillsModule {}

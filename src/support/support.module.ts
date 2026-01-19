import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * PR-00: Support Module
 * 
 * Provides in-app customer support ticket functionality.
 * Integrated but can be feature-flagged for controlled rollout.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}


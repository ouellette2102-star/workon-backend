import { Module } from '@nestjs/common';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GhlWebhookGuard } from '../ghl/guards/ghl-webhook.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ProsController],
  providers: [ProsService, GhlWebhookGuard],
})
export class ProsModule {}

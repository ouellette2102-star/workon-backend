import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}

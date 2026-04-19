import { Module } from '@nestjs/common';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProsController],
  providers: [ProsService],
})
export class ProsModule {}

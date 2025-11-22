import { Module } from '@nestjs/common';
import { PaymentsLocalController } from './payments-local.controller';
import { PaymentsLocalService } from './payments-local.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule, // Import AuthModule for JwtAuthGuard and JwtService
  ],
  controllers: [PaymentsLocalController],
  providers: [PaymentsLocalService],
  exports: [PaymentsLocalService],
})
export class PaymentsLocalModule {}


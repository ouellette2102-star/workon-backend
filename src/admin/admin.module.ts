import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../common/audit/audit.module';
import { AdminActionInterceptor } from '../auth/interceptors/admin-action.interceptor';

/**
 * Admin Module
 * PR-04: Enhanced with admin action logging
 *
 * All admin endpoints should use @AdminAction decorator
 * for automatic audit trail in TrustAuditLog.
 */
@Module({
  imports: [PrismaModule, AuthModule, PaymentsModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService, AdminActionInterceptor],
})
export class AdminModule {}


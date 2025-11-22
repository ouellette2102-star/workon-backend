import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
// Clerk disabled for local auth only
// import { ClerkAuthService } from './clerk-auth.service';
// import { LocalStrategy } from './strategies/local.strategy'; // Not used - login handled directly in controller
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// Local Auth (email/password)
import { LocalAuthService } from './local-auth.service';
import { JwtLocalStrategy } from './strategies/jwt-local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => UsersModule), // Use forwardRef to break circular dependency
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    // LocalStrategy removed - not needed, login handled directly in AuthController
    // ClerkAuthService removed - local auth only
    JwtAuthGuard,
    // Local Auth
    LocalAuthService,
    JwtLocalStrategy,
  ],
  exports: [
    JwtAuthGuard,
    JwtModule, // Export JwtModule so other modules can use JwtService
    PassportModule, // Export PassportModule for strategies
    LocalAuthService,
  ],
})
export class AuthModule {}


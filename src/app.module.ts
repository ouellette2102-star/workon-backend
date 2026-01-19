import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MissionsModule } from './missions/missions.module';
import { PaymentsModule } from './payments/payments.module';
import { ContractsModule } from './contracts/contracts.module';
import { AdminModule } from './admin/admin.module';
import { LoggerModule } from './logger/logger.module';
import { ProfileModule } from './profile/profile.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
// import { MissionTimeLogsModule } from './mission-time-logs/mission-time-logs.module';
import { StripeModule } from './stripe/stripe.module';
import { validate } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { MissionsLocalModule } from './missions-local/missions-local.module';
import { MetricsModule } from './metrics/metrics.module';
import { PaymentsLocalModule } from './payments-local/payments-local.module';
import { CatalogModule } from './catalog/catalog.module';
import { MissionPhotosModule } from './mission-photos/mission-photos.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';
import { MissionEventsModule } from './mission-events/mission-events.module';
import { OffersModule } from './offers/offers.module';
import { ComplianceModule } from './compliance/compliance.module';
import { AuditModule } from './common/audit/audit.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DevicesModule } from './devices/devices.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    // Configuration globale avec validation stricte des ENV
    // ⚠️ SÉCURITÉ: Valide les variables requises au démarrage
    // Charge .env.local en priorité, puis .env (relatif au dossier backend/)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate, // Valide DATABASE_URL, NODE_ENV (+ JWT_SECRET, CLERK_SECRET_KEY en prod)
    }),

    // Rate limiting - Protection contre les abus et attaques par force brute
    // ⚠️ SÉCURITÉ: Configurable via RATE_LIMIT_* ou THROTTLE_* (legacy)
    // Disable avec RATE_LIMIT_ENABLED=0
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        // Feature flag: désactiver complètement le rate limiting si RATE_LIMIT_ENABLED=0
        const enabled = config.get<string>('RATE_LIMIT_ENABLED', '1') !== '0';
        
        // Support des deux formats: RATE_LIMIT_* (nouveau) et THROTTLE_* (legacy)
        const ttl = config.get<number>('RATE_LIMIT_TTL') 
          || config.get<number>('THROTTLE_TTL', 60);
        const limit = config.get<number>('RATE_LIMIT_LIMIT') 
          || config.get<number>('THROTTLE_LIMIT', 100);

        if (!enabled) {
          console.log('⚠️  Rate limiting DISABLED (RATE_LIMIT_ENABLED=0)');
          // Throttler très permissif quand désactivé
          return { throttlers: [{ name: 'disabled', ttl: 1, limit: 999999 }] };
        }

        return {
          throttlers: [
            {
              name: 'global',
              ttl: ttl * 1000, // Convertir en millisecondes
              limit,
            },
          ],
        };
      },
    }),

    // Winston logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logLevel = config.get<string>('LOG_LEVEL', 'info');
        const nodeEnv = config.get<string>('NODE_ENV', 'development');

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
            // Format lisible pour le développement
            nodeEnv === 'development'
              ? winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                  return `${timestamp} [${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''} ${message} ${metaStr}`;
                })
              : winston.format.json(),
          ),
          defaultMeta: {
            service: 'workon-backend',
            environment: nodeEnv,
          },
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
            }),
            // Placeholder pour fichier de logs en production
            // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            // new winston.transports.File({ filename: 'logs/combined.log' }),
          ],
        };
      },
    }),

    // ============================================================
    // CORE INFRASTRUCTURE (no behavior change)
    // ============================================================
    PrismaModule,
    LoggerModule,
    // Audit logging for critical business events (PR-I2)
    AuditModule,
    // Nouveaux modules - Users first (needed by AuthModule)
    UsersModule,
    // Auth module (depends on UsersModule)
    AuthModule,
    // ============================================================
    // LEGACY (Clerk-based) MODULES - ACTIVE IN PRODUCTION
    // NOTE: Do not remove without explicit release decision.
    // ============================================================
    // Notifications module (needed by MissionsModule and MessagesModule)
    NotificationsModule,
    // Legacy modules (kept active)
    MissionsModule,
    MessagesModule,
    ContractsModule,
    PaymentsModule,
    StripeModule,
    AdminModule,
    ProfileModule,
    // MissionTimeLogsModule,
    // Health check
    HealthModule,
    // ============================================================
    // NATIVE (LocalUser/LocalMission) MODULES - ACTIVE IN PRODUCTION
    // ============================================================
    MissionsLocalModule,
    MetricsModule,
    PaymentsLocalModule,
    // Public read-only catalog API (categories + skills)
    CatalogModule,
    // Mission photos upload (PR#12)
    MissionPhotosModule,
    // Storage abstraction + Media streaming (PR#13)
    StorageModule,
    MediaModule,
    // Mission lifecycle events (audit + notifications)
    MissionEventsModule,
    // Offers module (marketplace offers flow)
    OffersModule,
    // Compliance module - Consentement légal (Loi 25 / GDPR / Stores)
    ComplianceModule,
    // Reviews module - User ratings & reviews
    ReviewsModule,
    // Devices module - Push notification tokens & device management
    DevicesModule,
    // Push module - Firebase Cloud Messaging (PR-PUSH)
    PushModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Appliquer le middleware correlationId sur toutes les routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}


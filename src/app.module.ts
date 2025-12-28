import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
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
    // ⚠️ SÉCURITÉ: Limite globale stricte - 20 requêtes par minute par IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const ttl = config.get<number>('THROTTLE_TTL', 60); // 60 secondes
        const limit = config.get<number>('THROTTLE_LIMIT', 20); // 20 requêtes (réduit de 100)

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

    // Modules métier
    PrismaModule,
    LoggerModule,
    // Nouveaux modules - Users first (needed by AuthModule)
    UsersModule,
    // Auth module (depends on UsersModule)
    AuthModule,
    // Notifications module (needed by MissionsModule and MessagesModule)
    NotificationsModule,
    // Missions module (re-enabled and fixed for current Prisma schema)
    MissionsModule,
    // Messages module (chat between worker and employer)
    MessagesModule,
    // Contracts module (mission contracts)
    ContractsModule,
    // Payments & Stripe modules (re-enabled with minimal MVP implementation)
    PaymentsModule,
    StripeModule,
    AdminModule,
    ProfileModule,
    // MissionTimeLogsModule,
    // Health check
    HealthModule,
    // MVP Marketplace modules (depend on AuthModule)
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
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


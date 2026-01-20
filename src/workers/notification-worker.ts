/**
 * Notification Worker Entry Point
 * PR-B: Queue Consumer Process
 *
 * Standalone process for draining the notification queue.
 * Run with: npm run worker:notifications
 *
 * This is a separate process from the web server for:
 * - Isolation (worker crash doesn't affect API)
 * - Scalability (can run multiple workers)
 * - Resource management (dedicated resources)
 *
 * RAILWAY DEPLOYMENT:
 * Create a separate Railway service with:
 * - Start Command: npm run worker:notifications
 * - Same env vars as web service
 * - No exposed ports needed
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { NotificationsWorkerModule } from './notifications-worker.module';
import { NotificationWorkerService } from '../notifications/notification-worker.service';

const logger = new Logger('NotificationWorker');

async function bootstrap(): Promise<void> {
  logger.log('Starting notification worker...');

  // Create NestJS application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(NotificationsWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Initialize Sentry if configured
  const configService = app.get(ConfigService);
  const sentryDsn = configService.get<string>('SENTRY_DSN');

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get<string>('NODE_ENV', 'development'),
      release: process.env.GIT_SHA || 'unknown',
      serverName: 'notification-worker',
      tracesSampleRate: 0.1,
    });
    logger.log('Sentry initialized for worker');
  }

  // Get worker service
  const workerService = app.get(NotificationWorkerService);

  // Handle shutdown signals
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down...`);
    workerService.stop();

    // Give time for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    Sentry.captureException(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });

  // Log worker configuration
  const status = workerService.getStatus();
  logger.log('Worker configuration:', status.config);

  // Start the worker
  try {
    await workerService.start();
    logger.log('Worker completed');
  } catch (error) {
    logger.error('Worker failed:', error);
    Sentry.captureException(error);
    process.exit(1);
  }

  await app.close();
}

// Run the worker
bootstrap().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});


import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Sentry from '@sentry/node';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GlobalHttpExceptionFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Logger sera configuré via Winston dans AppModule
    bufferLogs: true,
    // Activer rawBody pour les webhooks Stripe
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  // Railway sets PORT environment variable - use 8080 as fallback for Railway
  const port = parseInt(process.env.PORT || '8080', 10);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Sentry initialization (si DSN fourni)
  const sentryDsn = configService.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get<string>('SENTRY_ENVIRONMENT', nodeEnv),
      tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
      // Placeholder pour configuration additionnelle
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // Security middleware
  app.use(helmet());

  // CORS - Configuration stricte pour la sécurité
  // ⚠️ PRODUCTION: Définir FRONTEND_URL ou CORS_ORIGIN dans .env
  // ⚠️ NE JAMAIS utiliser origin: '*' en production avec credentials: true
  
  const isProd = nodeEnv === 'production';
  
  let allowedOrigins: string[] | boolean;

  if (isProd) {
    // PRODUCTION: Utiliser FRONTEND_URL ou CORS_ORIGIN (strict)
    const frontendUrl = configService.get<string>('FRONTEND_URL');
    const corsOrigin = configService.get<string>('CORS_ORIGIN');

    if (corsOrigin === '*') {
      console.warn(
        '⚠️ WARNING: CORS_ORIGIN is "*" in production. This is insecure but allows health checks.',
      );
      allowedOrigins = true; // Allow all for Railway health checks
    } else if (frontendUrl) {
      allowedOrigins = [frontendUrl];
    } else if (corsOrigin) {
      allowedOrigins = corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    } else {
      // Allow Railway health checks even without CORS config
      console.warn(
        '⚠️ WARNING: No CORS_ORIGIN or FRONTEND_URL set in production. Allowing all origins for health checks. ' +
        'Configure CORS_ORIGIN in Railway for security.',
      );
      allowedOrigins = true;
    }

    console.log(`🔒 CORS enabled for production origins: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : 'all (configure CORS_ORIGIN!)'}`);
  } else {
    // DEVELOPMENT: Autoriser localhost sur plusieurs ports
    const corsOrigin = configService.get<string>('CORS_ORIGIN');
    
    if (corsOrigin && corsOrigin !== '*') {
      // Utiliser CORS_ORIGIN si défini en dev (pour tester)
      allowedOrigins = corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    } else {
      // Default dev: autoriser localhost
      allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001', // Backend (si besoin de s'appeler lui-même)
      ];
    }

    console.log(`🔓 CORS enabled for development origins: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : 'all'}`);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: isProd ? 3600 : 300, // Cache preflight: 1h en prod, 5min en dev
  });

  // Servir les fichiers statiques (uploads)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // SUPPRIMÉ: Global prefix - tous les controllers ont maintenant des paths explicites /api/v1/*
  // app.setGlobalPrefix(apiPrefix);
  // Note: Les controllers utilisent @Controller('api/v1/...') directement

  // Global validation pipe avec Zod (via class-validator pour compatibilité NestJS)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Request ID middleware (pour traçabilité)
  // Utilise X-Request-ID du header si présent, sinon génère un UUID
  app.use((req: any, res: any, next: any) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // Global Exception Filter (standardise les erreurs API)
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Health check endpoint (liveness probe)
  app.getHttpAdapter().get('/healthz', (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness check endpoint (vérifie DB)
  // Vérifie que la connexion DB est active
  app.getHttpAdapter().get('/readyz', async (req: any, res: any) => {
    try {
      // Import PrismaService dynamiquement pour éviter les problèmes de DI
      const { PrismaService } = await import('./prisma/prisma.service');
      const prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
      res.json({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' }
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'not_ready', 
        timestamp: new Date().toISOString(),
        checks: { database: 'error' }
      });
    }
  });

  // Metrics placeholder endpoint
  app.getHttpAdapter().get('/metrics', (req: any, res: any) => {
    // Placeholder - à implémenter avec Prometheus si nécessaire
    res.json({ message: 'Metrics endpoint - à implémenter avec Prometheus' });
  });

  // Error handler Sentry (si activé)
  if (sentryDsn) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // Swagger API Documentation
  // Enable in dev by default, or in production if ENABLE_SWAGGER_PROD=true
  const enableSwaggerProd = configService.get<string>('ENABLE_SWAGGER_PROD') === 'true';
  const enableSwagger = nodeEnv !== 'production' || enableSwaggerProd;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('WorkOn API')
      .setDescription(
        '**WorkOn** - Marketplace de services pour travailleurs autonomes.\n\n' +
        '## Authentification\n' +
        'La plupart des endpoints nécessitent un token JWT Bearer.\n\n' +
        '## Rate Limiting\n' +
        'Les requêtes sont limitées par IP. Voir headers `X-RateLimit-*`.\n\n' +
        '## Environnements\n' +
        '- **Production**: https://api.workon.app\n' +
        '- **Staging**: https://staging-api.workon.app\n',
      )
      .setVersion('1.0.0')
      .setContact('WorkOn Team', 'https://workon.app', 'support@workon.app')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via /auth/login',
        },
        'JWT',
      )
      // Tags organisés par domaine
      .addTag('Health', 'Endpoints de santé et monitoring (publics)')
      .addTag('Auth', 'Authentification et gestion de session (public → JWT)')
      .addTag('Users', 'Gestion des utilisateurs (JWT)')
      .addTag('Profiles', 'Profils utilisateurs (JWT)')
      .addTag('Catalog', 'Catégories et compétences (public, read-only)')
      .addTag('Missions', 'Gestion des missions (JWT)')
      .addTag('Events', 'Journal d\'événements des missions (JWT)')
      .addTag('Payments', 'Paiements Stripe escrow (JWT)')
      .addTag('Media', 'Photos et fichiers (JWT + token signé)')
      .addTag('Messages', 'Messagerie entre parties (JWT)')
      .addTag('Contracts', 'Contrats de mission (JWT)')
      .addTag('Notifications', 'Notifications utilisateur (JWT)')
      .addTag('Admin', 'Administration (JWT + rôle Admin)')
      .addTag('Webhooks', 'Webhooks externes (signature Stripe)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'WorkOn API Documentation',
    });

    if (nodeEnv !== 'production') {
      console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
    }
  } else {
    console.log(`📚 Swagger disabled in production (set ENABLE_SWAGGER_PROD=true to enable)`);
  }

  // Railway requires binding to 0.0.0.0 to accept external connections
  await app.listen(port, '0.0.0.0');
  
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`✅ Application is running on: http://0.0.0.0:${port}/${apiPrefix}`);
  logger.log(`🚀 Environment: ${nodeEnv}`);
  logger.log(`🔌 PORT from env: ${process.env.PORT || 'not set (using 8080)'}`);
  
  // Health check should be accessible at root level (no prefix)
  logger.log(`💚 Health check available at: /healthz`);
}

bootstrap();
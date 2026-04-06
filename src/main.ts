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
import { execSync } from 'child_process';

/**
 * Run database migrations before starting the app.
 * This ensures schema and Prisma client are always in sync.
 */
async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.log('[migrations] Skipping — no remote DATABASE_URL');
    return;
  }

  console.log('[migrations] Running prisma db push...');
  // execSync imported at top of file
  try {
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      timeout: 60000,
    });
    console.log('[migrations] Schema sync complete');
  } catch (err) {
    console.error('[migrations] WARNING: prisma db push failed:', (err as Error).message);
    // Don't crash — app may still work if schema is compatible
  }
}

async function bootstrap() {
  // Run migrations first
  await runMigrations();

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

  // ============================================
  // SECURITY HEADERS (Helmet)
  // ============================================
  // Configuration explicite des headers de sécurité
  app.use(
    helmet({
      // Masquer le header X-Powered-By (Express)
      hidePoweredBy: true,
      // Empêcher le MIME sniffing
      noSniff: true,
      // Protection contre le clickjacking (frame)
      frameguard: { action: 'deny' },
      // XSS filter (legacy, mais utile pour vieux navigateurs)
      xssFilter: true,
      // Désactiver Content-Security-Policy par défaut (config avancée requise)
      contentSecurityPolicy: false,
      // Empêcher IE d'ouvrir des fichiers dans le contexte du site
      ieNoOpen: true,
      // DNS prefetch control
      dnsPrefetchControl: { allow: false },
    }),
  );

  // ============================================
  // CORS - Configuration stricte
  // ============================================
  // ⚠️ PRODUCTION: Définir FRONTEND_URL ou CORS_ORIGIN dans .env
  // ⚠️ NE JAMAIS utiliser origin: '*' en production avec credentials: true
  
  const isProd = nodeEnv === 'production';
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const corsFailFast = configService.get<string>('CORS_FAIL_FAST') === 'true';
  
  let allowedOrigins: string[] | boolean;

  if (isProd) {
    // PRODUCTION: Mode strict
    if (corsOrigin === '*') {
      if (corsFailFast) {
        // Fail-fast: refuser de démarrer avec CORS_ORIGIN="*"
        throw new Error(
          '❌ SECURITY: CORS_ORIGIN="*" is not allowed in production with CORS_FAIL_FAST=true. ' +
          'Set a specific origin list or remove CORS_FAIL_FAST.',
        );
      }
      console.warn('⚠️ SECURITY WARNING: CORS_ORIGIN="*" in production. Set specific origins for security.');
      allowedOrigins = true;
    } else if (frontendUrl) {
      allowedOrigins = [frontendUrl];
      console.log(`🔒 CORS: Allowing FRONTEND_URL: ${frontendUrl}`);
    } else if (corsOrigin) {
      allowedOrigins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
      console.log(`🔒 CORS: Allowing origins: ${allowedOrigins.join(', ')}`);
    } else {
      // Pas de config: permettre health checks mais avertir
      console.warn(
        '⚠️ SECURITY WARNING: No CORS config in production. ' +
        'Set CORS_ORIGIN or FRONTEND_URL in Railway for security.',
      );
      allowedOrigins = true;
    }
  } else {
    // DEVELOPMENT: Plus permissif
    if (corsOrigin && corsOrigin !== '*') {
      allowedOrigins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
    } else {
      // Default dev: localhost uniquement
      allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://localhost:8080',
      ];
    }
    console.log(`🔓 CORS (dev): ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : 'all'}`);
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

  // ============================================
  // LIVENESS PROBE (/healthz) + RAILWAY HEALTHCHECK (/health)
  // ============================================
  // Retourne TOUJOURS 200 si le process répond (même si DB down)
  // Utilisé par Railway/K8s pour vérifier que le container est vivant
  // /health = alias pour Railway (default healthcheck path)
  // /healthz = K8s standard
  const livenessResponse = () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
  });

  // Railway default healthcheck endpoint
  app.getHttpAdapter().get('/health', (req: any, res: any) => {
    res.json(livenessResponse());
  });

  // K8s standard liveness probe
  app.getHttpAdapter().get('/healthz', (req: any, res: any) => {
    res.json(livenessResponse());
  });

  // ============================================
  // READINESS PROBE (/readyz)
  // ============================================
  // Retourne 200 si le service est prêt à recevoir du trafic
  // Vérifie DB avec timeout de 2s pour ne pas bloquer
  const DB_CHECK_TIMEOUT_MS = 2000;
  
  app.getHttpAdapter().get('/readyz', async (req: any, res: any) => {
    const startTime = Date.now();
    
    try {
      // Import PrismaService dynamiquement pour éviter les problèmes de DI
      const { PrismaService } = await import('./prisma/prisma.service');
      const prisma = app.get(PrismaService);
      
      // DB check avec timeout
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB check timeout')), DB_CHECK_TIMEOUT_MS),
        ),
      ]);
      
      const latencyMs = Date.now() - startTime;
      
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'ok', latencyMs },
        },
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      // Ne pas exposer de détails sensibles
      const safeMessage = errorMessage.includes('timeout') 
        ? 'Database check timeout' 
        : 'Database connection failed';
      
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'error', message: safeMessage, latencyMs },
        },
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
  console.log('[backend] app booted');
  
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  
  // ============================================
  // STARTUP SUMMARY
  // ============================================
  logger.log(`✅ Application is running on: http://0.0.0.0:${port}/${apiPrefix}`);
  logger.log(`🚀 Environment: ${nodeEnv}`);
  logger.log(`🔌 PORT: ${process.env.PORT || '8080 (default)'}`);
  
  // ============================================
  // FEATURE FLAGS STATUS
  // ============================================
  const rateLimitEnabled = configService.get<string>('RATE_LIMIT_ENABLED', '1') !== '0';
  const rateLimitTtl = configService.get('RATE_LIMIT_TTL') || configService.get('THROTTLE_TTL', 60);
  const rateLimitMax = configService.get('RATE_LIMIT_LIMIT') || configService.get('THROTTLE_LIMIT', 100);
  
  logger.log(`🎛️  FEATURE FLAGS:`);
  logger.log(`    - RATE_LIMIT: ${rateLimitEnabled ? `✅ ON (${rateLimitMax} req/${rateLimitTtl}s)` : '❌ OFF'}`);
  logger.log(`    - SWAGGER: ${enableSwagger ? '✅ ON' : '❌ OFF'}${isProd && enableSwaggerProd ? ' (ENABLE_SWAGGER_PROD=true)' : ''}`);
  logger.log(`    - SENTRY: ${sentryDsn ? '✅ ON' : '❌ OFF'}`);
  logger.log(`    - DEBUG_ENV: ${configService.get('DEBUG_ENV') === '1' ? '✅ ON' : '❌ OFF'}`);
  
  // ============================================
  // SECURITY STATUS
  // ============================================
  logger.log(`🔒 SECURITY:`);
  logger.log(`    - Helmet: ✅ (noSniff, frameguard, xssFilter)`);
  logger.log(`    - CORS: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : (allowedOrigins ? 'ALL (⚠️ configure CORS_ORIGIN!)' : 'restricted')}`);
  logger.log(`💚 Health: /health, /healthz, /readyz, /api/v1/health (no throttle)`);
  
  // Warnings
  if (isProd && !corsOrigin && !frontendUrl) {
    logger.warn(`⚠️  ACTION REQUIRED: Set CORS_ORIGIN or FRONTEND_URL in production`);
  }
  if (isProd && !rateLimitEnabled) {
    logger.warn(`⚠️  WARNING: Rate limiting is DISABLED in production`);
  }
}

bootstrap();
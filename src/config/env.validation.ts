/**
 * Validation stricte des variables d'environnement requises
 * 
 * Ce module valide au démarrage que toutes les variables critiques
 * sont présentes et correctement formatées. Si une variable manque,
 * l'application crashe immédiatement avec un message clair.
 * 
 * SÉCURITÉ : Empêche le démarrage avec une config incomplète.
 * 
 * DEBUG: Si DEBUG_ENV=1, affiche un diagnostic détaillé (sans les valeurs sensibles).
 */

import { IsString, IsNotEmpty, IsOptional, IsIn, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// Version du package pour identification du build
const PACKAGE_VERSION = '1.0.0';

/**
 * Helper: Vérifie si une variable est définie et non vide (après trim).
 * Retourne false pour undefined, null, "", ou "   " (espaces).
 * @exported pour les tests unitaires
 */
export function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Helper: Masque une valeur pour le debug (2 premiers + 2 derniers caractères).
 * Ex: "my-secret-value" -> "my...ue"
 * Retourne "[empty]" si vide, "[short]" si < 4 caractères.
 */
function maskValue(value: unknown): string {
  if (value === undefined) return '[undefined]';
  if (value === null) return '[null]';
  if (typeof value !== 'string') return '[non-string]';
  if (value.length === 0) return '[empty]';
  if (value.trim().length === 0) return `[whitespace-only:${value.length}chars]`;
  if (value.length < 4) return '[short]';
  return `${value.substring(0, 2)}...${value.substring(value.length - 2)}`;
}

/**
 * Analyse détaillée d'une variable d'environnement pour debug.
 */
interface VarAnalysis {
  key: string;
  hasOwnProperty: boolean;
  rawValue: unknown;
  type: string;
  length: number;
  trimmedLength: number;
  isPresent: boolean;
  masked: string;
}

function analyzeVar(config: Record<string, unknown>, key: string): VarAnalysis {
  const hasOwn = Object.prototype.hasOwnProperty.call(config, key);
  const rawValue = config[key];
  const strValue = typeof rawValue === 'string' ? rawValue : '';
  
  return {
    key,
    hasOwnProperty: hasOwn,
    rawValue,
    type: typeof rawValue,
    length: typeof rawValue === 'string' ? rawValue.length : 0,
    trimmedLength: typeof rawValue === 'string' ? rawValue.trim().length : 0,
    isPresent: isPresent(rawValue),
    masked: maskValue(rawValue),
  };
}

/**
 * Log de diagnostic DÉTAILLÉ des variables d'environnement.
 * Activé UNIQUEMENT si DEBUG_ENV=1.
 * SÉCURITÉ: N'affiche JAMAIS les valeurs complètes.
 */
function logDetailedDiagnostic(config: Record<string, unknown>): void {
  if (config['DEBUG_ENV'] !== '1') return;

  const nodeEnv = config['NODE_ENV'];
  const isProduction = nodeEnv === 'production';
  const gitSha = config['GIT_SHA'] || config['RAILWAY_GIT_COMMIT_SHA'] || 'unknown';
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          🔍 ENV DIAGNOSTIC (DEBUG_ENV=1)                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║ BUILD VERSION : ${PACKAGE_VERSION.padEnd(49)}║`);
  console.log(`║ GIT SHA       : ${String(gitSha).substring(0, 40).padEnd(49)}║`);
  console.log(`║ NODE_ENV      : "${nodeEnv}" ${isProduction ? '(PRODUCTION)' : nodeEnv === 'staging' ? '(STAGING)' : '(DEV/TEST)'}`.padEnd(69) + '║');
  console.log(`║ TIMESTAMP     : ${new Date().toISOString().padEnd(49)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║ CRITICAL VARIABLES ANALYSIS:                                     ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');

  const criticalVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SIGNED_URL_SECRET',
    'FRONTEND_URL',
    'CORS_ORIGIN',
  ];

  for (const key of criticalVars) {
    const analysis = analyzeVar(config, key);
    const status = analysis.isPresent ? '✅' : '❌';
    const hasOwn = analysis.hasOwnProperty ? 'Y' : 'N';
    
    console.log(`║ ${status} ${key.padEnd(22)} │ hasOwn:${hasOwn} │ len:${String(analysis.length).padStart(3)} │ trim:${String(analysis.trimmedLength).padStart(3)} │ ${analysis.masked.padEnd(15).substring(0, 15)} ║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════╣');
  
  // Focus spécial sur SIGNED_URL_SECRET
  const signedUrlAnalysis = analyzeVar(config, 'SIGNED_URL_SECRET');
  console.log('║ 🎯 FOCUS: SIGNED_URL_SECRET                                      ║');
  console.log(`║   - Object.hasOwnProperty: ${signedUrlAnalysis.hasOwnProperty}`.padEnd(68) + '║');
  console.log(`║   - typeof: ${signedUrlAnalysis.type}`.padEnd(68) + '║');
  console.log(`║   - raw length: ${signedUrlAnalysis.length}`.padEnd(68) + '║');
  console.log(`║   - trimmed length: ${signedUrlAnalysis.trimmedLength}`.padEnd(68) + '║');
  console.log(`║   - isPresent(): ${signedUrlAnalysis.isPresent}`.padEnd(68) + '║');
  console.log(`║   - masked preview: ${signedUrlAnalysis.masked}`.padEnd(68) + '║');
  
  // Vérifier si la valeur a des guillemets embedded
  if (typeof signedUrlAnalysis.rawValue === 'string') {
    const hasQuotes = signedUrlAnalysis.rawValue.includes('"') || signedUrlAnalysis.rawValue.includes("'");
    const startsWithQuote = signedUrlAnalysis.rawValue.startsWith('"') || signedUrlAnalysis.rawValue.startsWith("'");
    console.log(`║   - contains quotes: ${hasQuotes}`.padEnd(68) + '║');
    console.log(`║   - starts with quote: ${startsWithQuote}`.padEnd(68) + '║');
  }
  
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║ RAW process.env keys count: ' + String(Object.keys(process.env).length).padEnd(38) + '║');
  console.log('║ Config object keys count: ' + String(Object.keys(config).length).padEnd(40) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

export class EnvironmentVariables {
  // ========================================
  // VARIABLES REQUISES (TOUS ENVIRONNEMENTS)
  // ========================================
  
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsIn(['development', 'production', 'test', 'staging'])
  @IsNotEmpty()
  NODE_ENV: string;

  // ========================================
  // VARIABLES OPTIONNELLES (DEV/PROD)
  // ========================================
  
  @IsString()
  @IsOptional()
  CLERK_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  CLERK_ISSUER?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  PORT?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  // ========================================
  // VARIABLES PRODUCTION-ONLY (optionnelles en dev)
  // ========================================
  
  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  // ========================================
  // RATE LIMITING (feature flag)
  // ========================================
  
  @IsString()
  @IsOptional()
  RATE_LIMIT_ENABLED?: string; // "1" = enabled, "0" = disabled (default: "1")

  @IsString()
  @IsOptional()
  RATE_LIMIT_TTL?: string; // Seconds (default: "60")

  @IsString()
  @IsOptional()
  RATE_LIMIT_LIMIT?: string; // Max requests per TTL (default: "100")

  // Legacy aliases (backward compat)
  @IsString()
  @IsOptional()
  THROTTLE_LIMIT?: string;

  @IsString()
  @IsOptional()
  THROTTLE_TTL?: string;

  // ========================================
  // FEATURE FLAGS
  // ========================================
  
  @IsString()
  @IsOptional()
  ENABLE_SWAGGER_PROD?: string; // "1" or "true" = enable Swagger in production

  @IsString()
  @IsOptional()
  DEBUG_ENV?: string; // "1" = enable env debug logging

  @IsString()
  @IsOptional()
  CORS_FAIL_FAST?: string; // "true" = fail if CORS_ORIGIN="*" in production

  // ========================================
  // SIGNED URLS (photos)
  // ========================================
  
  @IsString()
  @IsOptional()
  SIGNED_URL_SECRET?: string;

  @IsString()
  @IsOptional()
  SIGNED_URL_TTL_SECONDS?: string;

  // ========================================
  // NOTIFICATION DELIVERY (PR-A)
  // ========================================

  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string; // SendGrid API key for email delivery

  @IsString()
  @IsOptional()
  SENDGRID_FROM_EMAIL?: string; // Sender email address (default: noreply@workon.app)

  @IsString()
  @IsOptional()
  SENDGRID_FROM_NAME?: string; // Sender name (default: WorkOn)

  // ========================================
  // GHL + N8N WEBHOOKS (Demand Capture)
  // ========================================

  @IsString()
  @IsOptional()
  GHL_WEBHOOK_URL?: string; // GoHighLevel webhook for lead/pro routing

  @IsString()
  @IsOptional()
  GHL_WEBHOOK_SECRET?: string; // Secret for validating inbound GHL webhooks

  @IsString()
  @IsOptional()
  N8N_WEBHOOK_BASE?: string; // N8N base URL for automation webhooks (e.g. https://n8n.workon.app)

  // Firebase is already configured via FIREBASE_* env vars in push module

  // ========================================
  // NOTIFICATION WORKER (PR-B)
  // ========================================

  @IsString()
  @IsOptional()
  NOTIFICATION_WORKER_ENABLED?: string; // "1" = enabled (default), "0" = disabled

  @IsString()
  @IsOptional()
  NOTIFICATION_WORKER_BATCH_SIZE?: string; // Notifications per batch (default: 10)

  @IsString()
  @IsOptional()
  NOTIFICATION_WORKER_POLL_INTERVAL_MS?: string; // Polling interval in ms (default: 5000)

  @IsString()
  @IsOptional()
  NOTIFICATION_WORKER_MAX_ITERATIONS?: string; // Max iterations before exit (default: 1000)
}

/**
 * Valide les variables d'environnement au démarrage
 * Lance une erreur si une variable requise manque
 * 
 * THROW LOCATIONS pour SIGNED_URL_SECRET: ligne ~260
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // Log de diagnostic AVANT toute validation (pour debug des crashes)
  logDetailedDiagnostic(config);

  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      const constraints = error.constraints
        ? Object.values(error.constraints).join(', ')
        : 'Unknown error';
      return `  ❌ ${error.property}: ${constraints}`;
    });

    throw new Error(
      `❌ CONFIGURATION ERROR - Missing or invalid environment variables:\n\n${messages.join('\n')}\n\n` +
      `Please check your .env file in backend/ directory.\n` +
      `Required variables (all environments): DATABASE_URL, NODE_ENV\n` +
      `Required variables (production only): JWT_SECRET, JWT_REFRESH_SECRET, CLERK_SECRET_KEY\n`,
    );
  }

  const isProduction = validatedConfig.NODE_ENV === 'production';
  const isStaging = validatedConfig.NODE_ENV === 'staging';

  // ========================================
  // VALIDATIONS PRODUCTION-ONLY
  // Utilise isPresent() pour rejeter: undefined, null, "", "   "
  // Note: Staging utilise les mêmes checks que development (lenient)
  //       pour permettre le déploiement sans tous les secrets
  // ========================================
  
  if (isProduction) {
    // JWT_SECRET - LIGNE ~270
    if (!isPresent(validatedConfig.JWT_SECRET)) {
      console.error('❌ ERROR: JWT_SECRET is required in production. Authentication will fail.');
      throw new Error('JWT_SECRET is required in production');
    }

    // JWT_REFRESH_SECRET - LIGNE ~276
    if (!isPresent(validatedConfig.JWT_REFRESH_SECRET)) {
      console.error('❌ ERROR: JWT_REFRESH_SECRET is required in production. Token refresh will fail.');
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }

    // CLERK_SECRET_KEY - LIGNE ~282
    if (!isPresent(validatedConfig.CLERK_SECRET_KEY)) {
      console.error('❌ ERROR: CLERK_SECRET_KEY is required in production.');
      throw new Error('CLERK_SECRET_KEY is required in production');
    }

    // STRIPE_SECRET_KEY - LIGNE ~288
    if (!isPresent(validatedConfig.STRIPE_SECRET_KEY)) {
      console.error('❌ ERROR: STRIPE_SECRET_KEY is required in production. Payments will fail.');
      throw new Error('STRIPE_SECRET_KEY is required in production');
    }

    // STRIPE_WEBHOOK_SECRET - LIGNE ~294
    if (!isPresent(validatedConfig.STRIPE_WEBHOOK_SECRET)) {
      console.error('❌ ERROR: STRIPE_WEBHOOK_SECRET is required in production. Webhook signature validation will fail.');
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
    }

    // FRONTEND_URL or CORS_ORIGIN - LIGNE ~300
    if (!isPresent(validatedConfig.FRONTEND_URL) && !isPresent(validatedConfig.CORS_ORIGIN)) {
      throw new Error('FRONTEND_URL or CORS_ORIGIN must be set in production for CORS security');
    }

    // =====================================================
    // 🎯 SIGNED_URL_SECRET - SOURCE DU CRASH RAILWAY
    // =====================================================
    if (!isPresent(validatedConfig.SIGNED_URL_SECRET)) {
      const rawValue = validatedConfig.SIGNED_URL_SECRET;
      const rawLen = typeof rawValue === 'string' ? rawValue.length : 0;
      const trimLen = typeof rawValue === 'string' ? rawValue.trim().length : 0;
      
      // Message d'erreur contextuel selon le type de problème
      let errorContext = '';
      if (rawValue === undefined) {
        errorContext = 'Variable is UNDEFINED (not set in Railway)';
      } else if (rawValue === null) {
        errorContext = 'Variable is NULL';
      } else if (rawLen === 0) {
        errorContext = 'Variable is EMPTY STRING (set but no value)';
      } else if (trimLen === 0) {
        errorContext = `Variable contains ONLY WHITESPACE (${rawLen} chars). Railway UI issue: delete and re-add the variable.`;
      }
      
      console.error('❌ ERROR: SIGNED_URL_SECRET is required in production.');
      console.error(`   Diagnostic: ${errorContext}`);
      console.error('   Fix: In Railway Dashboard → Variables → Delete SIGNED_URL_SECRET → Add new → Redeploy');
      
      throw new Error(`SIGNED_URL_SECRET is required in production. ${errorContext}`);
    }
  } else {
    // ========================================
    // CONFIGURATION DÉVELOPPEMENT
    // ========================================
    
    console.log('\n🔧 Development environment detected - using default values for missing variables\n');

    // Valeurs par défaut pour JWT
    if (!isPresent(validatedConfig.JWT_SECRET)) {
      validatedConfig.JWT_SECRET = 'dev-jwt-secret-change-in-production';
      console.log('💡 INFO: JWT_SECRET not set. Using default dev value.');
    }

    if (!isPresent(validatedConfig.JWT_REFRESH_SECRET)) {
      validatedConfig.JWT_REFRESH_SECRET = 'dev-refresh-secret-change-in-production';
      console.log('💡 INFO: JWT_REFRESH_SECRET not set. Using default dev value.');
    }

    // Avertissements légers (non bloquants)
    if (!isPresent(validatedConfig.CLERK_SECRET_KEY)) {
      console.log('💡 INFO: CLERK_SECRET_KEY not set in development. Clerk auth features will be disabled.');
    }

    if (!isPresent(validatedConfig.STRIPE_SECRET_KEY) || !isPresent(validatedConfig.STRIPE_WEBHOOK_SECRET)) {
      console.warn(
        '⚠️  WARNING: Stripe env not fully configured (STRIPE_SECRET_KEY and/or STRIPE_WEBHOOK_SECRET missing). ' +
        'Stripe payment endpoints may return 503.',
      );
    }

    if (!isPresent(validatedConfig.SIGNED_URL_SECRET)) {
      console.warn('⚠️  WARNING: SIGNED_URL_SECRET not set. Using insecure default for development.');
    }

    console.log(''); // Ligne vide pour meilleure lisibilité
  }

  return validatedConfig;
}

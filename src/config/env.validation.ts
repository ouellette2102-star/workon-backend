/**
 * Validation stricte des variables d'environnement requises
 * 
 * Ce module valide au démarrage que toutes les variables critiques
 * sont présentes et correctement formatées. Si une variable manque,
 * l'application crashe immédiatement avec un message clair.
 * 
 * SÉCURITÉ : Empêche le démarrage avec une config incomplète.
 * 
 * DEBUG: Si DEBUG_ENV=1, affiche un log de diagnostic (sans les valeurs sensibles).
 */

import { IsString, IsNotEmpty, IsOptional, IsIn, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

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

export class EnvironmentVariables {
  // ========================================
  // VARIABLES REQUISES (TOUS ENVIRONNEMENTS)
  // ========================================
  
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsIn(['development', 'production', 'test'])
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

  @IsString()
  @IsOptional()
  THROTTLE_LIMIT?: string;

  @IsString()
  @IsOptional()
  THROTTLE_TTL?: string;

  // ========================================
  // SIGNED URLS (photos)
  // ========================================
  
  @IsString()
  @IsOptional()
  SIGNED_URL_SECRET?: string;

  @IsString()
  @IsOptional()
  SIGNED_URL_TTL_SECONDS?: string;
}

/**
 * Log de diagnostic des variables d'environnement.
 * Activé uniquement si DEBUG_ENV=1.
 * SÉCURITÉ: N'affiche JAMAIS les valeurs, uniquement leur présence (boolean).
 */
function logEnvDiagnostic(config: Record<string, unknown>, validatedConfig: EnvironmentVariables): void {
  if (config['DEBUG_ENV'] !== '1') return;

  const isProduction = validatedConfig.NODE_ENV === 'production';

  console.log('\n🔍 [DEBUG_ENV=1] DIAGNOSTIC VARIABLES D\'ENVIRONNEMENT');
  console.log('=' .repeat(60));
  console.log(`NODE_ENV             = "${validatedConfig.NODE_ENV}"`);
  console.log(`Environment détecté  = ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT/TEST'}`);
  console.log('-'.repeat(60));
  console.log('Variables critiques (présence uniquement):');
  console.log(`  DATABASE_URL         : ${isPresent(config['DATABASE_URL']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  JWT_SECRET           : ${isPresent(config['JWT_SECRET']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  JWT_REFRESH_SECRET   : ${isPresent(config['JWT_REFRESH_SECRET']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  CLERK_SECRET_KEY     : ${isPresent(config['CLERK_SECRET_KEY']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  STRIPE_SECRET_KEY    : ${isPresent(config['STRIPE_SECRET_KEY']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  STRIPE_WEBHOOK_SECRET: ${isPresent(config['STRIPE_WEBHOOK_SECRET']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  SIGNED_URL_SECRET    : ${isPresent(config['SIGNED_URL_SECRET']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  FRONTEND_URL         : ${isPresent(config['FRONTEND_URL']) ? '✅ présent' : '❌ manquant'}`);
  console.log(`  CORS_ORIGIN          : ${isPresent(config['CORS_ORIGIN']) ? '✅ présent' : '❌ manquant'}`);
  console.log('=' .repeat(60));
  console.log('');
}

/**
 * Valide les variables d'environnement au démarrage
 * Lance une erreur si une variable requise manque
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  // Log de diagnostic si DEBUG_ENV=1 (avant les validations pour debug des crashes)
  logEnvDiagnostic(config, validatedConfig);

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

  // ========================================
  // AVERTISSEMENTS PRODUCTION-ONLY
  // ========================================
  
  if (isProduction) {
    // Variables critiques en production
    // Utilise isPresent() pour rejeter undefined, null, "", et "   " (espaces seuls)
    
    if (!isPresent(validatedConfig.JWT_SECRET)) {
      console.error(
        '❌ ERROR: JWT_SECRET is required in production. Authentication will fail.',
      );
      throw new Error('JWT_SECRET is required in production');
    }

    if (!isPresent(validatedConfig.JWT_REFRESH_SECRET)) {
      console.error(
        '❌ ERROR: JWT_REFRESH_SECRET is required in production. Token refresh will fail.',
      );
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }

    if (!isPresent(validatedConfig.CLERK_SECRET_KEY)) {
      console.error(
        '❌ ERROR: CLERK_SECRET_KEY is required in production.',
      );
      throw new Error('CLERK_SECRET_KEY is required in production');
    }

    if (!isPresent(validatedConfig.STRIPE_SECRET_KEY)) {
      console.error(
        '❌ ERROR: STRIPE_SECRET_KEY is required in production. Payments will fail.',
      );
      throw new Error('STRIPE_SECRET_KEY is required in production');
    }

    if (!isPresent(validatedConfig.STRIPE_WEBHOOK_SECRET)) {
      console.error(
        '❌ ERROR: STRIPE_WEBHOOK_SECRET is required in production. Webhook signature validation will fail.',
      );
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
    }

    // SENTRY_DSN est optionnel même en prod (monitoring non bloquant)
    // Pas de console.warn en production - fail hard ou silent

    if (!isPresent(validatedConfig.FRONTEND_URL) && !isPresent(validatedConfig.CORS_ORIGIN)) {
      throw new Error(
        'FRONTEND_URL or CORS_ORIGIN must be set in production for CORS security',
      );
    }

    if (!isPresent(validatedConfig.SIGNED_URL_SECRET)) {
      console.error(
        '❌ ERROR: SIGNED_URL_SECRET is required in production. Photo signed URLs will be insecure.',
      );
      throw new Error('SIGNED_URL_SECRET is required in production');
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
      console.warn(
        '⚠️  WARNING: SIGNED_URL_SECRET not set. Using insecure default for development.',
      );
    }

    console.log(''); // Ligne vide pour meilleure lisibilité
  }

  return validatedConfig;
}


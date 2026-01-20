/**
 * Railway Release Command - Database Migrations
 * 
 * This script runs Prisma migrations during Railway's release phase,
 * BEFORE the healthcheck starts. This ensures:
 * 1. Migrations complete before the app starts
 * 2. Server starts immediately and passes healthcheck
 * 
 * RAILWAY CONFIGURATION:
 * - Build Command: npm run build
 * - Start Command: npm run start:railway
 * - Release Command: node scripts/railway-migrate.js
 * 
 * Set RAILWAY_SKIP_MIGRATIONS=1 in start command env to skip migrations there.
 */

const { spawnSync } = require('child_process');

function log(message) {
  console.log(`[railway-migrate] ${message}`);
}

function getDbHost() {
  const url = process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return '';
  }
}

log('Starting database migration...');

const dbHost = getDbHost();
log(`DB host: ${dbHost || 'unknown'}`);

if (!dbHost || dbHost.includes('localhost') || dbHost.includes('127.0.0.1')) {
  log('ERROR: Invalid DATABASE_URL host. Cannot run migrations.');
  process.exit(1);
}

log('Running prisma migrate deploy...');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  log(`Migration failed: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === 'number' && result.status !== 0) {
  log(`Migration failed with exit code ${result.status}`);
  process.exit(result.status);
}

log('Migration completed successfully!');


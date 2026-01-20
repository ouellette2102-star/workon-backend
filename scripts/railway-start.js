const { spawnSync } = require('child_process');

function getDbHost() {
  const url = process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return '';
  }
}

function log(message) {
  // Prefix for easy Railway log filtering
  console.log(`[railway-start] ${message}`);
}

function run(command, args, label) {
  log(`${label}...`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    log(`${label} failed: ${result.error.message}`);
    process.exit(1);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    log(`${label} failed with exit code ${result.status}`);
    process.exit(result.status);
  }
  log(`${label} done`);
}

const dbHost = getDbHost();
const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
if (isCi) {
  log('CI detected, skipping migrate + server start');
  process.exit(0);
}

log('boot');
log(`DB host: ${dbHost || 'unknown'}`);

// RAILWAY FIX: Skip migrations in start command
// Migrations should be run via Railway Release Command: npx prisma migrate deploy
// This allows the server to start IMMEDIATELY and pass healthcheck
const skipMigrations = process.env.RAILWAY_SKIP_MIGRATIONS === '1' || 
                       process.env.SKIP_MIGRATIONS === '1';

if (!skipMigrations) {
  // Legacy behavior: run migrations before server
  // WARNING: This can cause healthcheck timeouts if migrations are slow
  if (!dbHost || dbHost.includes('localhost') || dbHost.includes('127.0.0.1')) {
    log('Invalid DATABASE_URL host. Refusing to run migrations.');
    process.exit(1);
  }
  log('Running migrations (set RAILWAY_SKIP_MIGRATIONS=1 to skip)...');
  run('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy');
} else {
  log('Migrations skipped (RAILWAY_SKIP_MIGRATIONS=1). Ensure migrations run via Release Command.');
}

run('node', ['dist/main.js'], 'Start server');


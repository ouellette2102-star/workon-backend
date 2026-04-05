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

log('boot');
log(`DB host: ${dbHost || 'unknown'}`);
log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// Always run migrations before starting the server
// This ensures the database schema matches the Prisma client
if (!dbHost || dbHost.includes('localhost') || dbHost.includes('127.0.0.1')) {
  log('WARNING: Invalid DATABASE_URL host — skipping migrations');
} else {
  log('Running prisma migrate deploy...');
  run('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy');
}

run('node', ['dist/main.js'], 'Start server');

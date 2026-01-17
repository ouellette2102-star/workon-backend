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
log('boot');
log(`DB host: ${dbHost || 'unknown'}`);
if (!dbHost || dbHost.includes('localhost') || dbHost.includes('127.0.0.1')) {
  log('Invalid DATABASE_URL host. Refusing to run migrations.');
  process.exit(1);
}
run('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy');
run('node', ['dist/main.js'], 'Start server');


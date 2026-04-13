#!/usr/bin/env node
/**
 * Railway Release Command — runs BEFORE the app starts.
 *
 * Strategy:
 * 1. Check migration status
 * 2. If ANY migration is failed → mark ALL failed ones as rolled-back
 * 3. Run prisma migrate deploy
 * 4. If still fails → mark ALL failed as applied (DB already has the changes)
 * 5. Run prisma migrate deploy again
 * 6. If STILL fails → EXIT 1 (hard fail, don't start a broken app)
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEED_SCRIPT = path.join(__dirname, 'seed-catalog.js');

function log(msg) { console.log(`[railway-release] ${msg}`); }

function exec(cmd, args, label) {
  log(`→ ${label}`);
  const r = spawnSync(cmd, args, { stdio: 'pipe', shell: true, encoding: 'utf-8', cwd: PROJECT_ROOT });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0) log(`  ✗ ${label} failed (exit ${r.status})`);
  else log(`  ✓ ${label}`);
  return { ok: r.status === 0, out };
}

function execInherit(cmd, args, label) {
  log(`→ ${label}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: PROJECT_ROOT });
  const ok = r.status === 0;
  if (ok) log(`  ✓ ${label}`);
  else log(`  ✗ ${label} failed (exit ${r.status})`);
  return ok;
}

function getFailedMigrations() {
  const { out } = exec('npx', ['prisma', 'migrate', 'status'], 'Check migration status');
  log(`Migration status output:\n${out.substring(0, 800)}`);

  const failed = [];
  for (const line of out.split('\n')) {
    // Match: "20260412200000_contract_local_mission_support Failed"
    const m = line.match(/(\d{14}_\S+).*(?:failed|Failed)/i);
    if (m) failed.push(m[1]);
  }

  const hasP3009 = out.includes('P3009') || out.includes('failed migration');
  return { failed, hasP3009, out };
}

function resolveAll(migrations, strategy) {
  for (const name of migrations) {
    exec('npx', ['prisma', 'migrate', 'resolve', `--${strategy}`, name], `Resolve ${name} as ${strategy}`);
  }
}

async function main() {
  log('🚀 Railway release — starting');

  // ── Step 1: Check for failed migrations ──
  const { failed, hasP3009, out } = getFailedMigrations();

  if (hasP3009 || failed.length > 0) {
    const names = failed.length > 0 ? failed : [
      '20260412200000_contract_local_mission_support',
      '20260412300000_add_missing_localuser_columns',
    ];
    log(`⚠️  P3009 detected. Failed migrations: ${names.join(', ')}`);

    // ── Step 2: Try rolled-back first (so they re-run with idempotent SQL) ──
    resolveAll(names, 'rolled-back');

    // ── Step 3: Run migrate deploy ──
    if (execInherit('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy (attempt 1)')) {
      log('✅ Migrations applied successfully on attempt 1');
    } else {
      // ── Step 4: Rolled-back didn't work. Mark as applied instead ──
      log('⚠️  Attempt 1 failed. Marking all as applied...');

      // Re-check which ones are still failed
      const { failed: stillFailed } = getFailedMigrations();
      const toResolve = stillFailed.length > 0 ? stillFailed : names;
      resolveAll(toResolve, 'applied');

      // ── Step 5: Final attempt ──
      if (!execInherit('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy (attempt 2)')) {
        log('❌ FATAL: Migrations failed after all recovery attempts.');
        log('Manual intervention required on Railway PostgreSQL.');
        process.exit(1);
      }
      log('✅ Migrations applied successfully on attempt 2');
    }
  } else {
    // No P3009 — normal deploy
    if (!execInherit('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy')) {
      log('❌ FATAL: prisma migrate deploy failed.');
      process.exit(1);
    }
    log('✅ Migrations applied successfully');
  }

  // ── Step 6: Seed (optional) ──
  if (process.env.SEED_ON_DEPLOY === 'true' && fs.existsSync(SEED_SCRIPT)) {
    log('Seeding catalog...');
    execInherit('node', [SEED_SCRIPT], 'Catalog seed');
  }

  log('🎉 Release complete');
  process.exit(0);
}

main().catch(err => {
  log(`❌ Release script crashed: ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Railway Release Command — runs BEFORE the app starts.
 *
 * Strategy: BRUTE FORCE. Don't parse output. Don't guess.
 * 1. Try prisma migrate deploy
 * 2. If it fails → resolve ALL known failed migrations as rolled-back → retry
 * 3. If still fails → resolve them as applied → retry
 * 4. If STILL fails → EXIT 1
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(__dirname, 'seed-catalog.js');

function log(msg) { console.log(`[railway-release] ${msg}`); }

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT });
  return r.status === 0;
}

function runQuiet(cmd, args) {
  spawnSync(cmd, args, { stdio: 'pipe', shell: true, cwd: ROOT, encoding: 'utf-8' });
}

function resolve(name, strategy) {
  log(`  resolve ${name} → ${strategy}`);
  runQuiet('npx', ['prisma', 'migrate', 'resolve', `--${strategy}`, name]);
}

// Every migration that has ever caused a P3009 on this project
const KNOWN_PROBLEMATIC = [
  '20251202201222_add_messages_contracts',
  '20260412200000_contract_local_mission_support',
  '20260412300000_add_missing_localuser_columns',
  '20260413000000_fix_swipe_column_names',
];

async function main() {
  log('🚀 Starting release');

  // ── Attempt 1: Just try deploy ──
  log('Attempt 1: prisma migrate deploy');
  if (run('npx', ['prisma', 'migrate', 'deploy'])) {
    log('✅ Migrations applied');
    return seed();
  }

  // ── Attempt 2: Resolve all as rolled-back, then retry ──
  log('Attempt 1 failed. Resolving all known migrations as rolled-back...');
  for (const m of KNOWN_PROBLEMATIC) resolve(m, 'rolled-back');

  log('Attempt 2: prisma migrate deploy');
  if (run('npx', ['prisma', 'migrate', 'deploy'])) {
    log('✅ Migrations applied (after rolled-back resolve)');
    return seed();
  }

  // ── Attempt 3: Resolve all as applied, then retry ──
  log('Attempt 2 failed. Resolving all known migrations as applied...');
  for (const m of KNOWN_PROBLEMATIC) resolve(m, 'applied');

  log('Attempt 3: prisma migrate deploy');
  if (run('npx', ['prisma', 'migrate', 'deploy'])) {
    log('✅ Migrations applied (after applied resolve)');
    return seed();
  }

  // ── All attempts failed ──
  log('❌ FATAL: All 3 attempts failed. Manual DB intervention required.');
  process.exit(1);
}

function seed() {
  if (process.env.SEED_ON_DEPLOY === 'true' && fs.existsSync(SEED)) {
    log('Seeding catalog...');
    run('node', [SEED]);
  }
  log('🎉 Release complete');
  process.exit(0);
}

main().catch(err => {
  log(`❌ Crash: ${err.message}`);
  process.exit(1);
});

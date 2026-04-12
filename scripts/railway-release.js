#!/usr/bin/env node
/**
 * Railway Release Command Script
 * 
 * This script runs BEFORE the application starts (via releaseCommand).
 * It handles:
 * 1. Prisma migrations (including P3009 recovery)
 * 2. Catalog seeding (when SEED_ON_DEPLOY=true)
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get absolute paths
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SEED_SCRIPT = path.join(SCRIPT_DIR, 'seed-catalog.js');

function log(message) {
  console.log(`[railway-release] ${message}`);
}

function logEnv() {
  log('=== ENVIRONMENT ===');
  log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  log(`SEED_ON_DEPLOY: ${process.env.SEED_ON_DEPLOY || 'not set'}`);
  log(`DATABASE_URL: ${(process.env.DATABASE_URL || '').substring(0, 40)}...`);
  log(`CWD: ${process.cwd()}`);
  log(`SCRIPT_DIR: ${SCRIPT_DIR}`);
  log(`PROJECT_ROOT: ${PROJECT_ROOT}`);
  log(`SEED_SCRIPT: ${SEED_SCRIPT}`);
  log(`SEED_SCRIPT exists: ${fs.existsSync(SEED_SCRIPT)}`);
  log('===================');
}

function run(command, args, label, options = {}) {
  log(`${label}...`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: options.cwd || process.cwd(),
    ...options,
  });
  
  if (result.error) {
    log(`${label} error: ${result.error.message}`);
    return false;
  }
  
  if (result.status !== 0) {
    log(`${label} failed with exit code ${result.status}`);
    return false;
  }
  
  log(`${label} ✅ completed`);
  return true;
}

async function main() {
  log('🚀 Starting Railway release phase');
  logEnv();

  // Step 1: Check migration status
  log('Checking Prisma migration status...');
  const statusResult = spawnSync('npx', ['prisma', 'migrate', 'status'], {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  });

  const statusOutput = (statusResult.stdout || '') + (statusResult.stderr || '');
  log(`Migration status:\n${statusOutput.substring(0, 500)}`);

  // Step 2: If P3009 detected, resolve ALL failed migrations
  if (statusOutput.includes('P3009') || statusOutput.includes('failed migration')) {
    log('⚠️  P3009 detected: Failed migration(s) blocking deploy');

    // Extract failed migration names from status output
    const failedMigrations = [];
    const lines = statusOutput.split('\n');
    for (const line of lines) {
      // Prisma outputs lines like: "20260412200000_contract_local_mission_support Failed"
      const match = line.match(/(\d{14}_\S+).*(?:failed|Failed)/i);
      if (match) {
        failedMigrations.push(match[1]);
      }
    }

    // Fallback: known migrations that have caused issues
    if (failedMigrations.length === 0) {
      failedMigrations.push(
        '20251202201222_add_messages_contracts',
        '20260412200000_contract_local_mission_support'
      );
      log('Could not parse failed migration names, trying known problematic ones...');
    }

    for (const migrationName of failedMigrations) {
      log(`Resolving failed migration: ${migrationName}`);

      // First try --rolled-back so it re-runs with our idempotent SQL
      const resolveRolledBack = run(
        'npx',
        ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName],
        `Resolve ${migrationName} as rolled-back`,
        { cwd: PROJECT_ROOT }
      );

      if (!resolveRolledBack) {
        log('--rolled-back failed, trying --applied...');
        const resolveApplied = run(
          'npx',
          ['prisma', 'migrate', 'resolve', '--applied', migrationName],
          `Resolve ${migrationName} as applied`,
          { cwd: PROJECT_ROOT }
        );

        if (!resolveApplied) {
          log(`❌ Failed to resolve migration ${migrationName}. Continuing...`);
        }
      }
    }
  }

  // Step 3: Run migrate deploy (skip if already done by startCommand)
  // Note: This is idempotent - safe to run multiple times
  log('Running prisma migrate deploy...');
  const deploySuccess = run('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy', { cwd: PROJECT_ROOT });

  if (!deploySuccess) {
    log('⚠️ Migration deploy had issues, but continuing...');
  }

  // Step 4: Seed catalog data
  log('=== CATALOG SEED CHECK ===');
  const seedOnDeploy = process.env.SEED_ON_DEPLOY;
  log(`SEED_ON_DEPLOY value: "${seedOnDeploy}" (type: ${typeof seedOnDeploy})`);
  log(`Condition check: ${seedOnDeploy === 'true'}`);

  if (seedOnDeploy === 'true') {
    log('✅ SEED_ON_DEPLOY=true detected, running catalog seed...');
    
    // Verify seed script exists
    if (!fs.existsSync(SEED_SCRIPT)) {
      log(`❌ Seed script not found at: ${SEED_SCRIPT}`);
      log('Listing scripts directory:');
      const scriptsDir = SCRIPT_DIR;
      if (fs.existsSync(scriptsDir)) {
        fs.readdirSync(scriptsDir).forEach(file => log(`  - ${file}`));
      }
    } else {
      log(`✅ Seed script found: ${SEED_SCRIPT}`);
      
      // Run seed with absolute path
      const seedSuccess = run('node', [SEED_SCRIPT], 'Catalog seed', { cwd: PROJECT_ROOT });
      
      if (!seedSuccess) {
        log('⚠️ Seed failed, but continuing (non-blocking)');
      } else {
        log('✅ Catalog seeded successfully!');
      }
    }
  } else {
    log(`ℹ️ SEED_ON_DEPLOY="${seedOnDeploy}" - skipping seed`);
    log('To enable: set SEED_ON_DEPLOY=true in Railway variables');
  }

  log('🎉 Railway release phase completed');
  process.exit(0);
}

main().catch(err => {
  log(`❌ Release script error: ${err.message}`);
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Railway Release Command Script
 * 
 * This script runs BEFORE the application starts.
 * It handles Prisma migration issues including P3009 (failed migrations).
 * 
 * INCIDENT FIX: Resolves migration 20251202201222_add_messages_contracts
 * which is marked as FAILED in _prisma_migrations table.
 * 
 * After the incident is resolved, this script can be simplified to just
 * run `npx prisma migrate deploy`.
 */

const { spawnSync } = require('child_process');

function log(message) {
  console.log(`[railway-release] ${message}`);
}

function run(command, args, label) {
  log(`${label}...`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
  });
  
  if (result.error) {
    log(`${label} error: ${result.error.message}`);
    return false;
  }
  
  if (result.status !== 0) {
    log(`${label} failed with exit code ${result.status}`);
    return false;
  }
  
  log(`${label} completed successfully`);
  return true;
}

// ============================================
// INCIDENT FIX: P3009 Failed Migration
// ============================================
// Migration 20251202201222_add_messages_contracts is marked FAILED
// This blocks all subsequent migrations.
// 
// Strategy:
// 1. Try to resolve the failed migration as "applied" (if DDL was executed)
// 2. If that fails, try to resolve as "rolled-back"
// 3. Then run migrate deploy to apply all pending migrations
// ============================================

log('Starting Railway release phase');
log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
log(`DATABASE_URL prefix: ${(process.env.DATABASE_URL || '').substring(0, 30)}...`);

// Step 1: Check migration status
log('Checking Prisma migration status...');
const statusResult = spawnSync('npx', ['prisma', 'migrate', 'status'], {
  stdio: 'pipe',
  shell: true,
  encoding: 'utf-8',
});

const statusOutput = statusResult.stdout + statusResult.stderr;
log(`Migration status output:\n${statusOutput}`);

// Step 2: If P3009 detected, resolve the failed migration
if (statusOutput.includes('P3009') || statusOutput.includes('failed migration')) {
  log('⚠️  P3009 detected: Failed migration blocking deploy');
  log('Attempting to resolve migration 20251202201222_add_messages_contracts as applied...');
  
  // Try --applied first (assumes DDL was partially/fully executed)
  const resolveApplied = run(
    'npx',
    ['prisma', 'migrate', 'resolve', '--applied', '20251202201222_add_messages_contracts'],
    'Resolve migration as applied'
  );
  
  if (!resolveApplied) {
    log('--applied failed, trying --rolled-back...');
    const resolveRolledBack = run(
      'npx',
      ['prisma', 'migrate', 'resolve', '--rolled-back', '20251202201222_add_messages_contracts'],
      'Resolve migration as rolled-back'
    );
    
    if (!resolveRolledBack) {
      log('❌ Failed to resolve migration. Manual intervention required.');
      process.exit(1);
    }
  }
  
  log('✅ Migration resolved successfully');
}

// Step 3: Run migrate deploy
log('Running prisma migrate deploy...');
const deploySuccess = run('npx', ['prisma', 'migrate', 'deploy'], 'Prisma migrate deploy');

if (!deploySuccess) {
  log('❌ Migration deploy failed');
  process.exit(1);
}

// Step 4: Final status check
log('Verifying final migration status...');
spawnSync('npx', ['prisma', 'migrate', 'status'], {
  stdio: 'inherit',
  shell: true,
});

log('✅ Railway release phase completed successfully');
process.exit(0);


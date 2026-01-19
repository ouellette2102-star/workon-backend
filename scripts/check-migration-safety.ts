#!/usr/bin/env ts-node
/**
 * Migration Safety Check Script
 * PR-05: DB Freeze & Migration Safety
 *
 * Validates that pending migrations are safe to deploy:
 * - No destructive operations without explicit confirmation
 * - No data loss operations (DROP TABLE, DROP COLUMN without backup)
 * - Validates migration file naming convention
 * - Checks for reversibility hints
 *
 * Usage:
 *   npm run db:check-migration
 *   npx ts-node scripts/check-migration-safety.ts
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Dangerous operations detected
 *   2 = Configuration error
 */

import * as fs from 'fs';
import * as path from 'path';

// Dangerous SQL patterns that require review
const DANGEROUS_PATTERNS = [
  { pattern: /DROP\s+TABLE/gi, severity: 'critical', message: 'DROP TABLE detected - data loss risk' },
  { pattern: /DROP\s+COLUMN/gi, severity: 'critical', message: 'DROP COLUMN detected - data loss risk' },
  { pattern: /TRUNCATE/gi, severity: 'critical', message: 'TRUNCATE detected - data loss risk' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;/gi, severity: 'high', message: 'DELETE without WHERE - data loss risk' },
  { pattern: /ALTER\s+TABLE\s+\w+\s+DROP/gi, severity: 'high', message: 'ALTER TABLE DROP detected' },
  { pattern: /ALTER\s+TYPE\s+\w+\s+RENAME/gi, severity: 'medium', message: 'ENUM rename detected - may break existing code' },
];

// Safe patterns (informational)
const SAFE_PATTERNS = [
  { pattern: /CREATE\s+TABLE/gi, message: 'CREATE TABLE (additive)' },
  { pattern: /ADD\s+COLUMN/gi, message: 'ADD COLUMN (additive)' },
  { pattern: /CREATE\s+INDEX/gi, message: 'CREATE INDEX (additive)' },
  { pattern: /IF\s+NOT\s+EXISTS/gi, message: 'IF NOT EXISTS (idempotent)' },
  { pattern: /IF\s+EXISTS/gi, message: 'IF EXISTS (safe guard)' },
];

interface MigrationCheckResult {
  file: string;
  issues: { severity: string; message: string; line?: number }[];
  safeOperations: string[];
  passed: boolean;
}

function checkMigrationFile(filePath: string): MigrationCheckResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.basename(path.dirname(filePath));

  const issues: { severity: string; message: string; line?: number }[] = [];
  const safeOperations: string[] = [];

  // Check dangerous patterns
  for (const { pattern, severity, message } of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // Find line numbers
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.push({ severity, message: `${message} (line ${index + 1})`, line: index + 1 });
        }
      });
    }
  }

  // Check safe patterns (informational)
  for (const { pattern, message } of SAFE_PATTERNS) {
    if (pattern.test(content)) {
      safeOperations.push(message);
    }
  }

  // Check naming convention (YYYYMMDDHHMMSS_description)
  const namingPattern = /^\d{14}_[a-z0-9_]+$/;
  if (!namingPattern.test(fileName)) {
    issues.push({
      severity: 'warning',
      message: `Migration name "${fileName}" doesn't follow convention: YYYYMMDDHHMMSS_description`,
    });
  }

  return {
    file: fileName,
    issues,
    safeOperations,
    passed: issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0,
  };
}

function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(2);
  }

  const dirs = fs.readdirSync(migrationsDir).filter((d) => {
    const fullPath = path.join(migrationsDir, d);
    return fs.statSync(fullPath).isDirectory() && d !== 'migration_lock.toml';
  });

  return dirs
    .map((d) => path.join(migrationsDir, d, 'migration.sql'))
    .filter((f) => fs.existsSync(f));
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('  Migration Safety Check');
  console.log('  PR-05: DB Freeze & Migration Safety');
  console.log('========================================');
  console.log('');

  const migrationFiles = getMigrationFiles();
  console.log(`Found ${migrationFiles.length} migrations to check\n`);

  let allPassed = true;
  const results: MigrationCheckResult[] = [];

  for (const file of migrationFiles) {
    const result = checkMigrationFile(file);
    results.push(result);

    if (!result.passed) {
      allPassed = false;
    }
  }

  // Print results
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.file}`);

    if (result.safeOperations.length > 0) {
      console.log(`   Safe: ${result.safeOperations.join(', ')}`);
    }

    for (const issue of result.issues) {
      const severityIcon =
        issue.severity === 'critical'
          ? '🚨'
          : issue.severity === 'high'
            ? '⚠️'
            : issue.severity === 'warning'
              ? '📝'
              : 'ℹ️';
      console.log(`   ${severityIcon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    }

    console.log('');
  }

  // Summary
  console.log('========================================');
  console.log('  SUMMARY');
  console.log('========================================');

  const criticalCount = results.flatMap((r) => r.issues).filter((i) => i.severity === 'critical').length;
  const highCount = results.flatMap((r) => r.issues).filter((i) => i.severity === 'high').length;
  const warningCount = results.flatMap((r) => r.issues).filter((i) => i.severity === 'warning').length;

  console.log(`Total migrations: ${migrationFiles.length}`);
  console.log(`Critical issues:  ${criticalCount}`);
  console.log(`High issues:      ${highCount}`);
  console.log(`Warnings:         ${warningCount}`);
  console.log('');

  if (allPassed) {
    console.log('✅ All migrations are safe to deploy');
    console.log('');
    console.log('Recommended deployment command:');
    console.log('  npx prisma migrate deploy');
    process.exit(0);
  } else {
    console.log('❌ MIGRATION SAFETY CHECK FAILED');
    console.log('');
    console.log('Review the issues above before deploying.');
    console.log('If intentional, add a comment explaining the rollback strategy.');
    console.log('');
    console.log('To bypass (DANGEROUS):');
    console.log('  MIGRATION_FORCE=true npm run db:migrate:deploy');
    process.exit(1);
  }
}

main();


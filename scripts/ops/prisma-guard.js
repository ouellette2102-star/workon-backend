#!/usr/bin/env node
/**
 * Prisma Guard - Prevents unsafe database operations
 * 
 * Usage:
 *   node scripts/ops/prisma-guard.js <command>
 * 
 * This script warns about dangerous Prisma commands and blocks them
 * when DATABASE_URL points to production.
 */

const DANGEROUS_COMMANDS = [
  'db pull',
  'db push',
  'migrate reset',
  'migrate dev',
];

const PROD_INDICATORS = [
  'railway',
  'prod',
  'production',
  'supabase.co',
  'neon.tech',
  'planetscale',
];

function isProdUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return PROD_INDICATORS.some(indicator => lower.includes(indicator));
}

function isDangerousCommand(args) {
  const command = args.join(' ').toLowerCase();
  return DANGEROUS_COMMANDS.some(dangerous => command.includes(dangerous));
}

function main() {
  const args = process.argv.slice(2);
  const dbUrl = process.env.DATABASE_URL || '';
  const command = args.join(' ');
  
  console.log('\n🔒 Prisma Guard - Safety Check\n');
  
  // Check if command is dangerous
  if (isDangerousCommand(args)) {
    console.log(`⚠️  WARNING: Potentially dangerous command detected`);
    console.log(`   Command: prisma ${command}\n`);
    
    // Check if pointing to prod
    if (isProdUrl(dbUrl)) {
      console.log('🔴 BLOCKED: DATABASE_URL appears to be a production database!');
      console.log('');
      console.log('   This command is not allowed on production:');
      console.log(`   - prisma ${command}`);
      console.log('');
      console.log('   Safe alternatives:');
      console.log('   - npm run db:status        (check migration status)');
      console.log('   - npm run db:migrate:deploy (apply pending migrations)');
      console.log('');
      console.log('   If you really need to run this command:');
      console.log('   1. Ensure you have a backup');
      console.log('   2. Set PRISMA_GUARD_BYPASS=1');
      console.log('   3. Run the command again');
      console.log('');
      
      if (process.env.PRISMA_GUARD_BYPASS !== '1') {
        process.exit(1);
      } else {
        console.log('⚠️  PRISMA_GUARD_BYPASS is set - proceeding with caution...\n');
      }
    } else {
      console.log('🟡 WARNING: This command can cause data loss.');
      console.log('   DATABASE_URL does not appear to be production.');
      console.log('   Proceeding...\n');
    }
  } else {
    console.log(`✅ Command is safe: prisma ${command}\n`);
  }
  
  // Execute the actual prisma command
  const { spawnSync } = require('child_process');
  const result = spawnSync('npx', ['prisma', ...args], {
    stdio: 'inherit',
    shell: true,
  });
  
  process.exit(result.status || 0);
}

main();


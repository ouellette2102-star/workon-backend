// Diagnostic script - earnings 500 root cause
// Reads DATABASE_URL from env, connects to Railway prod, runs exact query
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

async function run() {
  console.log('=== EARNINGS 500 DIAGNOSTIC ===\n');
  console.log('DB host:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@').substring(0, 60) + '...');

  // Test 1: exact getSummary query (with non-existent user)
  console.log('\n[TEST 1] Exact getSummary query (paidAt selected)...');
  try {
    const result = await prisma.localMission.findMany({
      where: {
        assignedToUserId: 'test-user-does-not-exist-999',
        status: { in: ['completed', 'paid'] }
      },
      select: {
        id: true,
        price: true,
        status: true,
        paidAt: true
      }
    });
    console.log('[PASS] Query OK - rows returned:', result.length, '(expected 0)');
    console.log('[PASS] paidAt column IS accessible in prod DB');
  } catch (e) {
    console.log('[FAIL] Query ERROR:', e.message);
    console.log('[FAIL] Code:', e.code);
    console.log('[FAIL] Meta:', JSON.stringify(e.meta));
  }

  // Test 2: Check column existence directly
  console.log('\n[TEST 2] Column existence check...');
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'local_missions' 
      AND column_name IN ('paidAt', 'stripePaymentIntentId', 'price', 'status')
      ORDER BY column_name
    `);
    console.log('[PASS] Columns in local_missions:', JSON.stringify(cols));
  } catch(e) {
    console.log('[FAIL] Column check error:', e.message);
  }

  // Test 3: count local missions
  console.log('\n[TEST 3] Count localMission table...');
  try {
    const count = await prisma.localMission.count();
    console.log('[PASS] Total local_missions in prod DB:', count);
  } catch(e) {
    console.log('[FAIL]', e.message);
  }

  // Test 4: Test with a REAL user ID from prod (the one we created in smoke test)
  // We'll just try with a generic query to see if the query structure is valid
  console.log('\n[TEST 4] Try getHistory query structure...');
  try {
    const result = await prisma.localMission.findMany({
      where: {
        assignedToUserId: 'test-user-does-not-exist-999',
        status: { in: ['completed', 'paid'] }
      },
      select: {
        id: true,
        price: true,
        status: true,
        paidAt: true,
        updatedAt: true,
        category: true,
        city: true,
        address: true,
        createdByUser: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    });
    console.log('[PASS] getHistory query OK, rows:', result.length);
  } catch(e) {
    console.log('[FAIL] getHistory query ERROR:', e.message, e.code);
  }

  // Test 5: Check _prisma_migrations for the specific migration
  console.log('\n[TEST 5] Check paidAt migration in _prisma_migrations...');
  try {
    const migs = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE migration_name LIKE '%payment_fields%' 
      ORDER BY finished_at
    `);
    console.log('[INFO] Payment fields migration:', JSON.stringify(migs));
  } catch(e) {
    console.log('[FAIL]', e.message);
  }

  // Test 6: Check actual enum values in PostgreSQL
  console.log('\n[TEST 6] LocalMissionStatus enum values in prod DB...');
  try {
    const enumVals = await prisma.$queryRawUnsafe(`
      SELECT unnest(enum_range(NULL::"LocalMissionStatus"))::text AS val
    `);
    console.log('[PASS] Enum values:', enumVals.map(r => r.val).join(', '));
  } catch(e) {
    console.log('[FAIL]', e.message);
  }

  await prisma.$disconnect();
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

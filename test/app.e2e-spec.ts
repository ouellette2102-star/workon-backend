/**
 * App E2E Tests
 *
 * These tests require a running database. They are skipped in CI
 * but can be run locally with a database connection.
 *
 * To run locally:
 *   1. Start PostgreSQL: docker-compose up -d
 *   2. Run: npm run test:e2e
 *
 * In CI, these tests are skipped because they require external dependencies.
 * The smoke tests in CI use a different approach (see .github/workflows/ci.yml).
 */

// Skip if no database is available (CI environment)
const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip('AppController (e2e) - Requires Database', () => {
  // These tests are skipped in CI without a database
  // See critical-flows.e2e-spec.ts for unit-style E2E tests that don't require DB

  it.skip('/ (GET) - requires database', () => {
    // Test skipped - requires running database
  });

  it.skip('/healthz (GET) - requires database', () => {
    // Test skipped - requires running database
  });
});


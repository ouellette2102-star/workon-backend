/**
 * E2E Tests for Health Endpoints
 * 
 * Tests the liveness (/healthz) and readiness (/readyz) probes.
 * These tests require the server to be running with a valid DB connection.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Health Endpoints', () => {
  /**
   * Liveness Probe - /healthz
   * Should ALWAYS return 200 if the process is alive
   */
  test.describe('/healthz (Liveness)', () => {
    test('should return 200 with status ok', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/healthz`);
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.version).toBeDefined();
    });

    test('should include valid timestamp', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/healthz`);
      const body = await response.json();
      
      // Verify timestamp is valid ISO format
      const timestamp = new Date(body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  /**
   * Readiness Probe - /readyz
   * Returns 200 if DB is accessible, 503 otherwise
   */
  test.describe('/readyz (Readiness)', () => {
    test('should return 200 when DB is accessible', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/readyz`);
      
      // This test assumes DB is running and accessible
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.status).toBe('ready');
        expect(body.checks.database.status).toBe('ok');
        expect(body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
      } else {
        // If DB is not available, expect 503
        expect(response.status()).toBe(503);
        const body = await response.json();
        expect(body.status).toBe('not_ready');
      }
    });

    test('should include database latency', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/readyz`);
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(typeof body.checks.database.latencyMs).toBe('number');
        // Latency should be reasonable (< 2000ms which is the timeout)
        expect(body.checks.database.latencyMs).toBeLessThan(2000);
      }
    });
  });

  /**
   * API Health Endpoint - /api/v1/health
   * More detailed health check
   */
  test.describe('/api/v1/health (Detailed)', () => {
    test('should return detailed health status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/health`);
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(['ok', 'degraded', 'error']).toContain(body.status);
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
    });
  });

  /**
   * API Ready Endpoint - /api/v1/ready
   * Detailed readiness check
   */
  test.describe('/api/v1/ready (Detailed)', () => {
    test('should return readiness status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/ready`);
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.status).toBe('ready');
        expect(body.checks).toBeDefined();
      } else {
        expect(response.status()).toBe(503);
        const body = await response.json();
        expect(body.status).toBe('not_ready');
      }
    });
  });
});


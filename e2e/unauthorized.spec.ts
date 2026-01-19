import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * E2E Tests: Unauthorized Access
 * 
 * Validates that protected endpoints return 401 Unauthorized
 * when accessed without valid authentication.
 */
test.describe('Unauthorized Access', () => {
  test('GET /me should return 401 without token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('GET /earnings/summary should return 401 without token', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/earnings/summary`);
    expect(response.status()).toBe(401);
  });

  test('GET /messages/conversations should return 401 without token', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/messages/conversations`);
    expect(response.status()).toBe(401);
  });

  test('GET /devices should return 401 without token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/devices`);
    expect(response.status()).toBe(401);
  });

  test('POST /missions should return 401 without token', async ({
    request,
  }) => {
    const response = await request.post(`${API_BASE_URL}/missions`, {
      data: {
        title: 'Test Mission',
        location: { lat: 45.5, lng: -73.5 },
        priceCents: 10000,
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 with invalid token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.jwt.token',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 with expired token format', async ({ request }) => {
    // Simule un token expiré avec format JWT mais signature invalide
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';

    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 with malformed Authorization header', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: 'NotBearer sometoken',
      },
    });
    // Peut retourner 401 ou traiter comme pas de token
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Role-based Authorization', () => {
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    // Créer un worker pour tester les restrictions de rôle
    const workerEmail = `worker-unauth-${Date.now()}@test.com`;
    const signupResponse = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email: workerEmail,
        password: 'password123',
        name: 'Test Worker',
        role: 'WORKER',
      },
    });
    const data = await signupResponse.json();
    workerToken = data.accessToken;

    // Accepter le consentement
    const versionsResponse = await request.get(
      `${API_BASE_URL}/compliance/versions`,
    );
    const { versions } = await versionsResponse.json();

    await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
      data: { documentType: 'TERMS', version: versions.TERMS },
    });
    await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
      data: { documentType: 'PRIVACY', version: versions.PRIVACY },
    });
  });

  test('worker should not be able to create mission (employer only)', async ({
    request,
  }) => {
    const response = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
      data: {
        title: 'Test Mission',
        location: { lat: 45.5, lng: -73.5 },
        priceCents: 10000,
      },
    });

    // Devrait être 403 Forbidden car le worker n'a pas le droit
    expect([403]).toContain(response.status());
  });
});


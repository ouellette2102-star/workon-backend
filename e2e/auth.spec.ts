import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

test.describe('Auth Flow', () => {
  test('devrait permettre l\'inscription et la connexion', async ({ request }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';

    // Test signup
    const signupResponse = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password,
        name,
        role: 'WORKER',
      },
    });

    expect(signupResponse.ok()).toBeTruthy();
    const signupData = await signupResponse.json();
    expect(signupData).toHaveProperty('user');
    expect(signupData).toHaveProperty('accessToken');
    expect(signupData).toHaveProperty('refreshToken');
    expect(signupData.user.email).toBe(email);

    // Test login
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email,
        password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('accessToken');
    expect(loginData).toHaveProperty('refreshToken');
  });

  test('devrait échouer avec des identifiants invalides', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    expect(loginResponse.status()).toBe(401);
  });

  test('devrait rafraîchir le token', async ({ request }) => {
    // D'abord se connecter
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';

    await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password,
        name: 'Test User',
        role: 'WORKER',
      },
    });

    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email, password },
    });

    const { refreshToken } = await loginResponse.json();

    // Tester le refresh
    const refreshResponse = await request.post(`${API_BASE_URL}/auth/refresh`, {
      data: {
        refreshToken,
      },
    });

    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();
    expect(refreshData).toHaveProperty('accessToken');
    expect(refreshData).toHaveProperty('refreshToken');
  });
});


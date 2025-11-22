import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

test.describe('Payments Flow', () => {
  let employerToken: string;
  let missionId: string;

  test.beforeAll(async ({ request }) => {
    // Créer un employer et une mission
    const employerEmail = `employer-${Date.now()}@test.com`;
    const signup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email: employerEmail,
        password: 'password123',
        name: 'Test Employer',
        role: 'EMPLOYER',
        companyName: 'Test Company',
      },
    });
    const employerData = await signup.json();
    employerToken = employerData.accessToken;

    const createMission = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission avec paiement',
        location: {
          lat: 45.5017,
          lng: -73.5673,
        },
        priceCents: 30000,
      },
    });
    const mission = await createMission.json();
    missionId = mission.id;
  });

  test('devrait créer un PaymentIntent (employer)', async ({ request }) => {
    // Mock: En production, cela nécessiterait une vraie clé Stripe
    // Pour les tests, on peut mocker Stripe ou utiliser Stripe Test Mode
    const createIntentResponse = await request.post(
      `${API_BASE_URL}/payments/create-intent`,
      {
        headers: {
          Authorization: `Bearer ${employerToken}`,
        },
        data: {
          missionId,
        },
      },
    );

    // Si Stripe n'est pas configuré, on s'attend à une erreur
    if (createIntentResponse.status() === 400) {
      const error = await createIntentResponse.json();
      expect(error.message).toContain('Stripe');
    } else {
      expect(createIntentResponse.ok()).toBeTruthy();
      const data = await createIntentResponse.json();
      expect(data).toHaveProperty('clientSecret');
      expect(data).toHaveProperty('paymentIntentId');
    }
  });
});


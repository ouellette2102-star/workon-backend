import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Helper: Accepter les documents légaux pour un utilisateur
 * Nécessaire depuis l'ajout du ConsentGuard (PR-B)
 */
async function acceptAllConsent(request: any, token: string) {
  const versionsResponse = await request.get(`${API_BASE_URL}/compliance/versions`);
  const { versions } = await versionsResponse.json();

  await request.post(`${API_BASE_URL}/compliance/accept`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { documentType: 'TERMS', version: versions.TERMS },
  });

  await request.post(`${API_BASE_URL}/compliance/accept`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { documentType: 'PRIVACY', version: versions.PRIVACY },
  });
}

test.describe('Payments Flow', () => {
  let employerToken: string;
  let missionId: string;

  test.beforeAll(async ({ request }) => {
    // Créer employer et worker
    const employerEmail = `employer-${Date.now()}@test.com`;
    const employerSignup = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: employerEmail,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Employer',
        role: 'employer',
      },
    });
    const employerData = await employerSignup.json();
    employerToken = employerData.accessToken;
    await acceptAllConsent(request, employerToken);

    const workerEmail = `worker-${Date.now()}@test.com`;
    const workerSignup = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: workerEmail,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Worker',
        role: 'worker',
      },
    });
    const workerData = await workerSignup.json();
    const workerToken = workerData.accessToken;
    await acceptAllConsent(request, workerToken);

    // Créer mission, accepter, démarrer, terminer (prérequis pour paiement)
    const createMission = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission avec paiement',
        description: 'Mission de test pour paiement',
        category: 'cleaning',
        city: 'Montréal',
        address: '123 Rue Test',
        latitude: 45.5017,
        longitude: -73.5673,
        price: 300,
      },
    });
    const mission = await createMission.json();
    missionId = mission.id;

    await request.post(`${API_BASE_URL}/missions-local/${missionId}/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    await request.post(`${API_BASE_URL}/missions-local/${missionId}/start`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    await request.post(`${API_BASE_URL}/missions-local/${missionId}/complete`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
  });

  test('devrait créer un PaymentIntent (employer)', async ({ request }) => {
    const createIntentResponse = await request.post(
      `${API_BASE_URL}/payments-local/intent`,
      {
        headers: { Authorization: `Bearer ${employerToken}` },
        data: { missionId },
      },
    );

    // 503 = Stripe non configuré, 201 = succès
    if (createIntentResponse.status() === 503) {
      const error = await createIntentResponse.json();
      expect(error.message?.toLowerCase()).toMatch(/stripe|payment|configur/);
    } else if (createIntentResponse.status() === 201) {
      const data = await createIntentResponse.json();
      expect(data).toHaveProperty('clientSecret');
      expect(data).toHaveProperty('paymentIntentId');
    } else {
      expect(createIntentResponse.ok(), `Unexpected status ${createIntentResponse.status()}`).toBeTruthy();
    }
  });
});


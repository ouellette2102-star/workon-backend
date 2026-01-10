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

test.describe('Contracts Flow', () => {
  let employerToken: string;
  let workerToken: string;
  let missionId: string;
  let contractNonce: string;

  test.beforeAll(async ({ request }) => {
    // Créer employer et worker
    const employerEmail = `employer-${Date.now()}@test.com`;
    const employerSignup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email: employerEmail,
        password: 'password123',
        name: 'Test Employer',
        role: 'EMPLOYER',
        companyName: 'Test Company',
      },
    });
    const employerData = await employerSignup.json();
    employerToken = employerData.accessToken;

    // Accepter le consentement pour employer (requis par ConsentGuard)
    await acceptAllConsent(request, employerToken);

    const workerEmail = `worker-${Date.now()}@test.com`;
    const workerSignup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email: workerEmail,
        password: 'password123',
        name: 'Test Worker',
        role: 'WORKER',
      },
    });
    const workerData = await workerSignup.json();
    workerToken = workerData.accessToken;

    // Accepter le consentement pour worker (requis par ConsentGuard)
    await acceptAllConsent(request, workerToken);

    // Créer une mission et l'accepter
    const createMission = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission avec contrat',
        location: {
          lat: 45.5017,
          lng: -73.5673,
        },
        priceCents: 40000,
      },
    });
    const mission = await createMission.json();
    missionId = mission.id;

    // Réserver et accepter
    await request.post(`${API_BASE_URL}/missions/${missionId}/reserve`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
      data: {},
    });

    await request.post(`${API_BASE_URL}/missions/${missionId}/accept`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
  });

  test('devrait créer un contrat pour une mission', async ({ request }) => {
    const getContractResponse = await request.get(
      `${API_BASE_URL}/contracts/${missionId}/create`,
      {
        headers: {
          Authorization: `Bearer ${employerToken}`,
        },
      },
    );

    expect(getContractResponse.ok()).toBeTruthy();
    const contract = await getContractResponse.json();
    expect(contract).toHaveProperty('signatureNonce');
    expect(contract).toHaveProperty('missionId', missionId);
    contractNonce = contract.signatureNonce;
  });

  test('devrait signer un contrat (worker)', async ({ request }) => {
    // Obtenir le contrat d'abord
    const getContractResponse = await request.get(
      `${API_BASE_URL}/contracts/${missionId}/create`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
      },
    );
    const contract = await getContractResponse.json();

    // Signer le contrat
    const signResponse = await request.post(`${API_BASE_URL}/contracts/${missionId}/sign`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
      data: {
        signatureNonce: contract.signatureNonce,
      },
    });

    expect(signResponse.ok()).toBeTruthy();
    const signedContract = await signResponse.json();
    expect(signedContract.signedByWorker).toBe(true);
  });

  test('devrait vérifier le statut du contrat', async ({ request }) => {
    const statusResponse = await request.get(`${API_BASE_URL}/contracts/${missionId}`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
    });

    expect(statusResponse.ok()).toBeTruthy();
    const status = await statusResponse.json();
    expect(status).toHaveProperty('exists');
    expect(status).toHaveProperty('signedByWorker');
    expect(status).toHaveProperty('signedByEmployer');
  });
});


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

test.describe('Missions Flow', () => {
  let employerToken: string;
  let workerToken: string;
  let employerId: string;
  let workerId: string;
  let missionId: string;

  test.beforeAll(async ({ request }) => {
    // Créer un employer
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
    employerId = employerData.user.id;

    // Accepter le consentement pour employer (requis par ConsentGuard)
    await acceptAllConsent(request, employerToken);

    // Créer un worker
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
    workerToken = workerData.accessToken;
    workerId = workerData.user.id;

    // Accepter le consentement pour worker (requis par ConsentGuard)
    await acceptAllConsent(request, workerToken);
  });

  test('devrait créer une mission (employer)', async ({ request }) => {
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Test Mission',
        description: 'Description de la mission de test',
        category: 'cleaning',
        price: 150.0,
        latitude: 45.5017,
        longitude: -73.5673,
        city: 'Montréal',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const mission = await createResponse.json();
    expect(mission).toHaveProperty('id');
    expect(mission.title).toBe('Test Mission');
    missionId = mission.id;
  });

  test('devrait lister les missions nearby', async ({ request }) => {
    const listResponse = await request.get(
      `${API_BASE_URL}/missions-local/nearby?latitude=45.5017&longitude=-73.5673&radiusKm=50`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
      }
    );

    expect(listResponse.ok()).toBeTruthy();
    const data = await listResponse.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('devrait accepter une mission (worker)', async ({ request }) => {
    // Créer une mission d'abord
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission à accepter',
        description: 'Description de test',
        category: 'cleaning',
        price: 200.0,
        latitude: 45.5017,
        longitude: -73.5673,
        city: 'Montréal',
      },
    });
    const mission = await createResponse.json();

    // Accepter la mission
    const acceptResponse = await request.post(
      `${API_BASE_URL}/missions-local/${mission.id}/accept`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
      },
    );

    expect(acceptResponse.ok()).toBeTruthy();
    const acceptedMission = await acceptResponse.json();
    expect(acceptedMission.status).toBe('assigned');
    expect(acceptedMission.assignedToUserId).toBeTruthy();
  });

  test('devrait démarrer une mission assignée (worker)', async ({ request }) => {
    // Créer une mission
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission à démarrer',
        description: 'Description de test',
        category: 'cleaning',
        price: 250.0,
        latitude: 45.5017,
        longitude: -73.5673,
        city: 'Montréal',
      },
    });
    const mission = await createResponse.json();

    // Accepter la mission (open → assigned)
    await request.post(`${API_BASE_URL}/missions-local/${mission.id}/accept`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });

    // Démarrer la mission (assigned → in_progress)
    const startResponse = await request.post(
      `${API_BASE_URL}/missions-local/${mission.id}/start`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
      },
    );

    expect(startResponse.ok()).toBeTruthy();
    const startedMission = await startResponse.json();
    expect(startedMission.status).toBe('in_progress');
  });
});


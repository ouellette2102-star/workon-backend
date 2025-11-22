import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

test.describe('Missions Flow', () => {
  let employerToken: string;
  let workerToken: string;
  let employerId: string;
  let workerId: string;
  let missionId: string;

  test.beforeAll(async ({ request }) => {
    // Créer un employer
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
    employerId = employerData.user.id;

    // Créer un worker
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
    workerId = workerData.user.id;
  });

  test('devrait créer une mission (employer)', async ({ request }) => {
    const createResponse = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Test Mission',
        location: {
          lat: 45.5017,
          lng: -73.5673,
        },
        priceCents: 15000,
        currency: 'CAD',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const mission = await createResponse.json();
    expect(mission).toHaveProperty('id');
    expect(mission.title).toBe('Test Mission');
    missionId = mission.id;
  });

  test('devrait lister les missions', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/missions?page=1&limit=10`);

    expect(listResponse.ok()).toBeTruthy();
    const data = await listResponse.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('devrait réserver une mission (worker)', async ({ request }) => {
    // Créer une mission d'abord
    const createResponse = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission à réserver',
        location: {
          lat: 45.5017,
          lng: -73.5673,
        },
        priceCents: 20000,
      },
    });
    const mission = await createResponse.json();

    // Réserver la mission
    const reserveResponse = await request.post(
      `${API_BASE_URL}/missions/${mission.id}/reserve`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
        data: {
          reservationMinutes: 15,
        },
      },
    );

    expect(reserveResponse.ok()).toBeTruthy();
    const reservedMission = await reserveResponse.json();
    expect(reservedMission.status).toBe('RESERVED');
    expect(reservedMission.workerId).toBeTruthy();
  });

  test('devrait accepter une mission réservée (worker)', async ({ request }) => {
    // Créer et réserver une mission
    const createResponse = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${employerToken}`,
      },
      data: {
        title: 'Mission à accepter',
        location: {
          lat: 45.5017,
          lng: -73.5673,
        },
        priceCents: 25000,
      },
    });
    const mission = await createResponse.json();

    await request.post(`${API_BASE_URL}/missions/${mission.id}/reserve`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
      data: {},
    });

    // Accepter la mission
    const acceptResponse = await request.post(
      `${API_BASE_URL}/missions/${mission.id}/accept`,
      {
        headers: {
          Authorization: `Bearer ${workerToken}`,
        },
      },
    );

    expect(acceptResponse.ok()).toBeTruthy();
    const acceptedMission = await acceptResponse.json();
    expect(acceptedMission.status).toBe('IN_PROGRESS');
  });
});


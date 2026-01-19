import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  WORKON BACKEND - CORE E2E FLOWS                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Ce fichier teste les parcours BUSINESS CRITIQUES de bout en bout.           ║
 * ║                                                                              ║
 * ║  Objectif: Un acheteur technique peut lire ces tests et comprendre           ║
 * ║  EXACTEMENT comment WorkOn fonctionne.                                       ║
 * ║                                                                              ║
 * ║  Flows couverts:                                                             ║
 * ║   1. AUTH FLOW - Inscription, connexion, accès protégé                       ║
 * ║   2. MISSION FLOW - Lifecycle complet d'une mission                          ║
 * ║   3. EARNINGS FLOW - Revenus après mission complétée                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper: Accepter les documents légaux (TERMS + PRIVACY)
 * Requis par ConsentGuard avant d'accéder aux endpoints protégés.
 */
async function acceptAllConsent(request: APIRequestContext, token: string): Promise<void> {
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

/**
 * Helper: Créer un utilisateur et accepter le consentement
 */
async function createUserWithConsent(
  request: APIRequestContext,
  role: 'WORKER' | 'EMPLOYER',
  prefix: string,
): Promise<{ token: string; userId: string; email: string }> {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;

  const signupData: Record<string, unknown> = {
    email,
    password: 'Password123!',
    name: `Test ${role}`,
    role,
  };

  if (role === 'EMPLOYER') {
    signupData.companyName = 'Test Company';
  }

  const signupResponse = await request.post(`${API_BASE_URL}/auth/signup`, {
    data: signupData,
  });

  expect(signupResponse.ok(), `Signup failed for ${role}`).toBeTruthy();

  const userData = await signupResponse.json();
  const token = userData.accessToken;
  const userId = userData.user.id;

  await acceptAllConsent(request, token);

  return { token, userId, email };
}

// ============================================================================
// 1️⃣ AUTH FLOW - Inscription, Connexion, Accès protégé
// ============================================================================

test.describe('1️⃣ AUTH FLOW - Inscription, Connexion, Accès protégé', () => {
  /**
   * Scénario: Nouvel utilisateur s'inscrit et se connecte
   * 
   * Business: Un travailleur autonome découvre WorkOn et crée son compte.
   */
  test('1.1 Signup → Login → Access protected endpoint', async ({ request }) => {
    const email = `auth-test-${Date.now()}@test.com`;
    const password = 'SecurePassword123!';

    // STEP 1: Inscription
    const signupResponse = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password,
        name: 'Auth Test User',
        role: 'WORKER',
      },
    });

    expect(signupResponse.ok()).toBeTruthy();
    const signupData = await signupResponse.json();

    expect(signupData).toHaveProperty('accessToken');
    expect(signupData).toHaveProperty('refreshToken');
    expect(signupData).toHaveProperty('user');
    expect(signupData.user.email).toBe(email);

    // STEP 2: Connexion avec les mêmes identifiants
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email, password },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();

    expect(loginData).toHaveProperty('accessToken');
    expect(loginData).toHaveProperty('refreshToken');
    expect(loginData.accessToken).toBeTruthy();

    // STEP 3: Accès à un endpoint protégé avec le token
    const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });

    expect(meResponse.ok()).toBeTruthy();
    const meData = await meResponse.json();
    expect(meData.email).toBe(email);
  });

  /**
   * Scénario: Accès refusé sans token
   * 
   * Security: Les endpoints protégés DOIVENT retourner 401 sans token.
   */
  test('1.2 Protected endpoint returns 401 without token', async ({ request }) => {
    const endpoints = [
      '/auth/me',
      '/earnings/summary',
      '/missions-local/my-missions',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint}`);
      expect(response.status(), `${endpoint} should return 401`).toBe(401);
    }
  });

  /**
   * Scénario: Accès refusé avec token invalide
   * 
   * Security: Un token malformé ou expiré est rejeté.
   */
  test('1.3 Protected endpoint returns 401 with invalid token', async ({ request }) => {
    const invalidTokens = [
      'invalid.jwt.token',
      'Bearer ',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid',
    ];

    for (const token of invalidTokens) {
      const response = await request.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status(), `Token "${token.substring(0, 20)}..." should be rejected`).toBe(401);
    }
  });

  /**
   * Scénario: Refresh token fonctionne
   * 
   * Business: L'utilisateur reste connecté sans re-saisir son mot de passe.
   */
  test('1.4 Refresh token returns new access token', async ({ request }) => {
    const email = `refresh-test-${Date.now()}@test.com`;

    await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password: 'Password123!',
        name: 'Refresh Test',
        role: 'WORKER',
      },
    });

    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email, password: 'Password123!' },
    });

    const { refreshToken, accessToken: originalToken } = await loginResponse.json();

    const refreshResponse = await request.post(`${API_BASE_URL}/auth/refresh`, {
      data: { refreshToken },
    });

    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();

    expect(refreshData).toHaveProperty('accessToken');
    expect(refreshData).toHaveProperty('refreshToken');
    // Le nouveau token doit être différent (ou non, selon l'implémentation)
    expect(refreshData.accessToken).toBeTruthy();
  });

  /**
   * Scénario: Login échoue avec mauvais mot de passe
   * 
   * Security: Ne pas révéler si l'email existe.
   */
  test('1.5 Login fails with wrong password', async ({ request }) => {
    const email = `wrong-pwd-${Date.now()}@test.com`;

    await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password: 'CorrectPassword123!',
        name: 'Wrong Pwd Test',
        role: 'WORKER',
      },
    });

    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email, password: 'WrongPassword!' },
    });

    expect(loginResponse.status()).toBe(401);
  });
});

// ============================================================================
// 2️⃣ MISSION FLOW - Lifecycle complet d'une mission
// ============================================================================

test.describe('2️⃣ MISSION FLOW - Lifecycle complet', () => {
  let employerToken: string;
  let workerToken: string;
  let workerId: string;

  test.beforeAll(async ({ request }) => {
    // Créer un employer avec consentement
    const employer = await createUserWithConsent(request, 'EMPLOYER', 'mission-employer');
    employerToken = employer.token;

    // Créer un worker avec consentement
    const worker = await createUserWithConsent(request, 'WORKER', 'mission-worker');
    workerToken = worker.token;
    workerId = worker.userId;
  });

  /**
   * Scénario: Lifecycle complet - HAPPY PATH
   * 
   * Business: Un client crée une mission, un travailleur l'accepte, la réalise, et la termine.
   * C'est LE parcours principal de WorkOn.
   */
  test('2.1 Complete mission lifecycle: Create → Accept → Start → Complete', async ({ request }) => {
    // STEP 1: Employer crée une mission
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission E2E Test - Plomberie',
        description: 'Réparer une fuite sous l\'évier',
        category: 'plumbing',
        city: 'Montreal',
        address: '123 Rue Test',
        latitude: 45.5017,
        longitude: -73.5673,
        price: 150,
      },
    });

    expect(createResponse.ok(), 'Mission creation should succeed').toBeTruthy();
    const mission = await createResponse.json();

    expect(mission.id).toBeTruthy();
    expect(mission.title).toBe('Mission E2E Test - Plomberie');
    expect(mission.status).toBe('open');

    const missionId = mission.id;

    // STEP 2: Worker trouve la mission (nearby search)
    const nearbyResponse = await request.get(
      `${API_BASE_URL}/missions-local/nearby?latitude=45.5017&longitude=-73.5673&radiusKm=10`,
      { headers: { Authorization: `Bearer ${workerToken}` } },
    );

    expect(nearbyResponse.ok()).toBeTruthy();
    const nearbyMissions = await nearbyResponse.json();

    // La mission créée devrait être dans les résultats
    const foundMission = nearbyMissions.find((m: any) => m.id === missionId);
    expect(foundMission, 'Created mission should be in nearby results').toBeTruthy();

    // STEP 3: Worker accepte la mission
    const acceptResponse = await request.post(`${API_BASE_URL}/missions-local/${missionId}/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(acceptResponse.ok(), 'Mission accept should succeed').toBeTruthy();
    const acceptedMission = await acceptResponse.json();

    expect(acceptedMission.status).toBe('assigned');
    expect(acceptedMission.assignedToUserId).toBe(workerId);

    // STEP 4: Worker démarre la mission
    const startResponse = await request.post(`${API_BASE_URL}/missions-local/${missionId}/start`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(startResponse.ok(), 'Mission start should succeed').toBeTruthy();
    const startedMission = await startResponse.json();

    expect(startedMission.status).toBe('in_progress');

    // STEP 5: Worker termine la mission
    const completeResponse = await request.post(`${API_BASE_URL}/missions-local/${missionId}/complete`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(completeResponse.ok(), 'Mission complete should succeed').toBeTruthy();
    const completedMission = await completeResponse.json();

    expect(completedMission.status).toBe('completed');
  });

  /**
   * Scénario: Worker ne peut pas créer de mission
   * 
   * Business: Seuls les employers/clients peuvent poster des missions.
   */
  test('2.2 Worker cannot create mission (403 Forbidden)', async ({ request }) => {
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${workerToken}` },
      data: {
        title: 'Invalid Mission',
        category: 'plumbing',
        city: 'Montreal',
        address: '123 Rue Test',
        latitude: 45.5017,
        longitude: -73.5673,
        price: 100,
      },
    });

    expect(createResponse.status()).toBe(403);
  });

  /**
   * Scénario: Accept mission inexistante
   * 
   * Error handling: L'API retourne 404 pour une mission qui n'existe pas.
   */
  test('2.3 Accept non-existent mission returns 404', async ({ request }) => {
    const acceptResponse = await request.post(`${API_BASE_URL}/missions-local/non-existent-id/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(acceptResponse.status()).toBe(404);
  });

  /**
   * Scénario: Ne peut pas accepter une mission déjà assignée
   * 
   * Business: Une mission ne peut être acceptée que si elle est "open".
   */
  test('2.4 Cannot accept already assigned mission (400)', async ({ request }) => {
    // Créer une mission
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission Already Assigned Test',
        category: 'cleaning',
        city: 'Montreal',
        address: '456 Rue Test',
        latitude: 45.51,
        longitude: -73.56,
        price: 80,
      },
    });
    const mission = await createResponse.json();

    // Premier worker accepte
    await request.post(`${API_BASE_URL}/missions-local/${mission.id}/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    // Créer un second worker
    const worker2 = await createUserWithConsent(request, 'WORKER', 'worker2');

    // Second worker essaie d'accepter → devrait échouer
    const acceptResponse = await request.post(`${API_BASE_URL}/missions-local/${mission.id}/accept`, {
      headers: { Authorization: `Bearer ${worker2.token}` },
    });

    expect(acceptResponse.status()).toBe(400);
  });

  /**
   * Scénario: Seul le worker assigné peut démarrer la mission
   * 
   * Security: Un autre worker ne peut pas démarrer une mission qui ne lui est pas assignée.
   */
  test('2.5 Only assigned worker can start mission (403)', async ({ request }) => {
    // Créer une mission et l'assigner au worker principal
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission Start Test',
        category: 'moving',
        city: 'Montreal',
        address: '789 Rue Test',
        latitude: 45.52,
        longitude: -73.55,
        price: 200,
      },
    });
    const mission = await createResponse.json();

    await request.post(`${API_BASE_URL}/missions-local/${mission.id}/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    // Créer un autre worker qui essaie de démarrer
    const otherWorker = await createUserWithConsent(request, 'WORKER', 'other-worker');

    const startResponse = await request.post(`${API_BASE_URL}/missions-local/${mission.id}/start`, {
      headers: { Authorization: `Bearer ${otherWorker.token}` },
    });

    expect(startResponse.status()).toBe(403);
  });

  /**
   * Scénario: Annulation par le créateur
   * 
   * Business: Un employer peut annuler sa propre mission.
   */
  test('2.6 Employer can cancel their own mission', async ({ request }) => {
    // Créer une mission
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission Cancel Test',
        category: 'gardening',
        city: 'Montreal',
        address: '111 Rue Cancel',
        latitude: 45.49,
        longitude: -73.58,
        price: 120,
      },
    });
    const mission = await createResponse.json();

    // Employer annule
    const cancelResponse = await request.post(`${API_BASE_URL}/missions-local/${mission.id}/cancel`, {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    expect(cancelResponse.ok()).toBeTruthy();
    const cancelledMission = await cancelResponse.json();
    expect(cancelledMission.status).toBe('cancelled');
  });

  /**
   * Scénario: Employer peut voir ses missions créées
   * 
   * Business: Dashboard employer avec liste de ses missions.
   */
  test('2.7 Employer can list their created missions', async ({ request }) => {
    // Créer plusieurs missions
    for (let i = 0; i < 2; i++) {
      await request.post(`${API_BASE_URL}/missions-local`, {
        headers: { Authorization: `Bearer ${employerToken}` },
        data: {
          title: `Mission List Test ${i}`,
          category: 'cleaning',
          city: 'Montreal',
          address: `${i}00 Rue List`,
          latitude: 45.5 + i * 0.01,
          longitude: -73.5 + i * 0.01,
          price: 50 + i * 10,
        },
      });
    }

    // Lister mes missions
    const listResponse = await request.get(`${API_BASE_URL}/missions-local/my-missions`, {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    expect(listResponse.ok()).toBeTruthy();
    const missions = await listResponse.json();

    expect(Array.isArray(missions)).toBeTruthy();
    expect(missions.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 3️⃣ EARNINGS FLOW - Revenus après mission complétée
// ============================================================================

test.describe('3️⃣ EARNINGS FLOW - Revenus après mission complétée', () => {
  let employerToken: string;
  let workerToken: string;
  let workerId: string;
  let completedMissionId: string;

  test.beforeAll(async ({ request }) => {
    // Créer employer et worker
    const employer = await createUserWithConsent(request, 'EMPLOYER', 'earnings-employer');
    employerToken = employer.token;

    const worker = await createUserWithConsent(request, 'WORKER', 'earnings-worker');
    workerToken = worker.token;
    workerId = worker.userId;

    // Créer et compléter une mission pour générer des earnings
    const createResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employerToken}` },
      data: {
        title: 'Mission for Earnings Test',
        category: 'plumbing',
        city: 'Montreal',
        address: '999 Rue Earnings',
        latitude: 45.5,
        longitude: -73.5,
        price: 200, // 200$ pour le test
      },
    });
    const mission = await createResponse.json();
    completedMissionId = mission.id;

    // Accepter
    await request.post(`${API_BASE_URL}/missions-local/${completedMissionId}/accept`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    // Démarrer
    await request.post(`${API_BASE_URL}/missions-local/${completedMissionId}/start`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    // Compléter
    await request.post(`${API_BASE_URL}/missions-local/${completedMissionId}/complete`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
  });

  /**
   * Scénario: Worker voit son résumé de gains
   * 
   * Business: Dashboard earnings avec totalLifetime, totalPaid, totalAvailable.
   */
  test('3.1 Worker gets earnings summary with completed mission', async ({ request }) => {
    const summaryResponse = await request.get(`${API_BASE_URL}/earnings/summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(summaryResponse.ok()).toBeTruthy();
    const summary = await summaryResponse.json();

    expect(summary).toHaveProperty('totalLifetimeGross');
    expect(summary).toHaveProperty('totalLifetimeNet');
    expect(summary).toHaveProperty('totalPaid');
    expect(summary).toHaveProperty('totalPending');
    expect(summary).toHaveProperty('totalAvailable');
    expect(summary).toHaveProperty('completedMissionsCount');
    expect(summary).toHaveProperty('commissionRate');
    expect(summary).toHaveProperty('currency');

    // Avec la mission complétée, il devrait y avoir au moins ces montants
    expect(summary.totalLifetimeGross).toBeGreaterThanOrEqual(200);
    expect(summary.completedMissionsCount).toBeGreaterThanOrEqual(1);
    expect(summary.currency).toBe('CAD');
    expect(summary.commissionRate).toBeGreaterThan(0); // Commission > 0
  });

  /**
   * Scénario: Worker voit son historique de gains paginé
   * 
   * Business: Liste des transactions avec pagination.
   */
  test('3.2 Worker gets paginated earnings history', async ({ request }) => {
    const historyResponse = await request.get(`${API_BASE_URL}/earnings/history?limit=10`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(historyResponse.ok()).toBeTruthy();
    const history = await historyResponse.json();

    expect(history).toHaveProperty('transactions');
    expect(history).toHaveProperty('totalCount');
    expect(history).toHaveProperty('nextCursor');

    expect(Array.isArray(history.transactions)).toBeTruthy();
    expect(history.totalCount).toBeGreaterThanOrEqual(1);

    // Vérifier la structure d'une transaction
    if (history.transactions.length > 0) {
      const tx = history.transactions[0];
      expect(tx).toHaveProperty('missionId');
      expect(tx).toHaveProperty('missionTitle');
      expect(tx).toHaveProperty('grossAmount');
      expect(tx).toHaveProperty('commissionAmount');
      expect(tx).toHaveProperty('netAmount');
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('currency');
    }
  });

  /**
   * Scénario: Worker voit le détail d'un gain par mission
   * 
   * Business: Détail complet d'un paiement pour une mission spécifique.
   */
  test('3.3 Worker gets earnings by specific mission', async ({ request }) => {
    const byMissionResponse = await request.get(
      `${API_BASE_URL}/earnings/by-mission/${completedMissionId}`,
      { headers: { Authorization: `Bearer ${workerToken}` } },
    );

    expect(byMissionResponse.ok()).toBeTruthy();
    const earning = await byMissionResponse.json();

    expect(earning.missionId).toBe(completedMissionId);
    expect(earning.missionTitle).toBe('Mission for Earnings Test');
    expect(earning.grossAmount).toBe(200);
    expect(earning.commissionAmount).toBeGreaterThan(0);
    expect(earning.netAmount).toBeLessThan(earning.grossAmount);
    expect(earning.category).toBe('plumbing');
    expect(earning.city).toBe('Montreal');
  });

  /**
   * Scénario: Earnings endpoint retourne 401 sans token
   * 
   * Security: Les earnings sont privés et protégés.
   */
  test('3.4 Earnings endpoints require authentication', async ({ request }) => {
    const endpoints = ['/earnings/summary', '/earnings/history'];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint}`);
      expect(response.status(), `${endpoint} should require auth`).toBe(401);
    }
  });

  /**
   * Scénario: Worker ne peut pas voir les earnings d'un autre worker
   * 
   * Security: Isolation des données entre utilisateurs.
   */
  test('3.5 Worker cannot access earnings of mission not assigned to them', async ({ request }) => {
    // Créer un autre worker
    const otherWorker = await createUserWithConsent(request, 'WORKER', 'other-earnings-worker');

    // Essayer d'accéder aux earnings de la mission du premier worker
    const byMissionResponse = await request.get(
      `${API_BASE_URL}/earnings/by-mission/${completedMissionId}`,
      { headers: { Authorization: `Bearer ${otherWorker.token}` } },
    );

    // Devrait retourner 404 (not found for this user)
    expect(byMissionResponse.status()).toBe(404);
  });

  /**
   * Scénario: Employer n'a pas accès aux earnings (rôle worker seulement)
   * 
   * Business: Les earnings sont pour les workers uniquement.
   */
  test('3.6 Employer earnings summary returns empty or zero', async ({ request }) => {
    const summaryResponse = await request.get(`${API_BASE_URL}/earnings/summary`, {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    expect(summaryResponse.ok()).toBeTruthy();
    const summary = await summaryResponse.json();

    // Employer n'a pas de missions assignées, donc 0 earnings
    expect(summary.totalLifetimeGross).toBe(0);
    expect(summary.completedMissionsCount).toBe(0);
  });
});

// ============================================================================
// TESTS COMPLÉMENTAIRES - Edge Cases
// ============================================================================

test.describe('🔍 Edge Cases & Error Handling', () => {
  /**
   * Vérifier que les health endpoints fonctionnent (prérequis E2E)
   */
  test('Health check endpoints are working', async ({ request }) => {
    const BASE_URL = process.env.API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

    // Liveness
    const healthzResponse = await request.get(`${BASE_URL}/healthz`);
    expect(healthzResponse.ok()).toBeTruthy();

    const healthzData = await healthzResponse.json();
    expect(healthzData.status).toBe('ok');

    // Readiness
    const readyzResponse = await request.get(`${BASE_URL}/readyz`);
    expect(readyzResponse.ok()).toBeTruthy();

    const readyzData = await readyzResponse.json();
    expect(readyzData.status).toBe('ready');
  });

  /**
   * Vérifier la validation des données (DTO)
   */
  test('API validates mission creation data', async ({ request }) => {
    const employer = await createUserWithConsent(request, 'EMPLOYER', 'validation-test');

    // Mission sans titre
    const noTitleResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employer.token}` },
      data: {
        category: 'plumbing',
        city: 'Montreal',
        latitude: 45.5,
        longitude: -73.5,
        price: 100,
      },
    });

    expect(noTitleResponse.status()).toBe(400);

    // Mission sans coordonnées
    const noCoordsResponse = await request.post(`${API_BASE_URL}/missions-local`, {
      headers: { Authorization: `Bearer ${employer.token}` },
      data: {
        title: 'Test',
        category: 'plumbing',
        city: 'Montreal',
        price: 100,
      },
    });

    expect(noCoordsResponse.status()).toBe(400);
  });
});


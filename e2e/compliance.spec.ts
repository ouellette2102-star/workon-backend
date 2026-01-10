import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

test.describe('Compliance Flow - Consentement Légal', () => {
  let userToken: string;

  test.beforeAll(async ({ request }) => {
    // Créer un utilisateur pour les tests
    const email = `compliance-test-${Date.now()}@test.com`;
    const signup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password: 'password123',
        name: 'Test Compliance User',
        role: 'WORKER',
      },
    });
    const userData = await signup.json();
    userToken = userData.accessToken;
  });

  test('GET /compliance/versions - retourne les versions actives (public)', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/compliance/versions`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.versions).toBeDefined();
    expect(data.versions.TERMS).toBeDefined();
    expect(data.versions.PRIVACY).toBeDefined();
    expect(data.updatedAt).toBeDefined();
  });

  test('GET /compliance/status - sans auth → 401', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/compliance/status`);
    expect(response.status()).toBe(401);
  });

  test('GET /compliance/status - retourne statut consentement (auth)', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/compliance/status`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.isComplete).toBeDefined();
    expect(data.documents).toBeDefined();
    expect(data.missing).toBeDefined();
    expect(Array.isArray(data.missing)).toBeTruthy();
  });

  test('POST /compliance/accept - version invalide → 400', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        documentType: 'TERMS',
        version: '0.0', // Version invalide
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('VERSION_MISMATCH');
  });

  test('POST /compliance/accept TERMS - version valide → succès', async ({
    request,
  }) => {
    // D'abord, récupérer la version active
    const versionsResponse = await request.get(
      `${API_BASE_URL}/compliance/versions`,
    );
    const { versions } = await versionsResponse.json();

    const response = await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        documentType: 'TERMS',
        version: versions.TERMS,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accepted).toBe(true);
    expect(data.documentType).toBe('TERMS');
    expect(data.version).toBe(versions.TERMS);
    expect(data.acceptedAt).toBeDefined();
  });

  test('POST /compliance/accept PRIVACY - version valide → succès', async ({
    request,
  }) => {
    const versionsResponse = await request.get(
      `${API_BASE_URL}/compliance/versions`,
    );
    const { versions } = await versionsResponse.json();

    const response = await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        documentType: 'PRIVACY',
        version: versions.PRIVACY,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accepted).toBe(true);
    expect(data.documentType).toBe('PRIVACY');
  });

  test('POST /compliance/accept - double acceptation → idempotent (succès)', async ({
    request,
  }) => {
    const versionsResponse = await request.get(
      `${API_BASE_URL}/compliance/versions`,
    );
    const { versions } = await versionsResponse.json();

    // Première acceptation (ou re-acceptation)
    const response1 = await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        documentType: 'TERMS',
        version: versions.TERMS,
      },
    });

    expect(response1.ok()).toBeTruthy();

    // Deuxième acceptation (idempotence)
    const response2 = await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        documentType: 'TERMS',
        version: versions.TERMS,
      },
    });

    expect(response2.ok()).toBeTruthy();
    const data = await response2.json();
    expect(data.accepted).toBe(true);
    expect(data.alreadyAccepted).toBe(true);
  });

  test('GET /compliance/status - après acceptation → isComplete=true', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/compliance/status`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.isComplete).toBe(true);
    expect(data.missing).toEqual([]);
    expect(data.documents.TERMS.accepted).toBe(true);
    expect(data.documents.PRIVACY.accepted).toBe(true);
  });
});

test.describe('Consent Guard - Blocage sans consentement', () => {
  test('Endpoint protégé sans consentement → 403 CONSENT_REQUIRED', async ({
    request,
  }) => {
    // Créer un nouvel utilisateur (sans consentement)
    const email = `consent-guard-${Date.now()}@test.com`;
    const signup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password: 'password123',
        name: 'No Consent User',
        role: 'EMPLOYER',
        companyName: 'Test Company',
      },
    });
    const { accessToken } = await signup.json();

    // Tenter de créer une mission (endpoint protégé par @RequireConsent)
    const createMission = await request.post(`${API_BASE_URL}/missions`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        title: 'Test Mission',
        description: 'Test',
        category: 'Test',
      },
    });

    expect(createMission.status()).toBe(403);
    const error = await createMission.json();
    expect(error.error).toBe('CONSENT_REQUIRED');
    expect(error.missing).toBeDefined();
    expect(Array.isArray(error.missing)).toBeTruthy();
  });
});

/**
 * PR-C1: ConsentGuard coverage on critical controllers
 * Tests pour vérifier que Payments, Contracts et Offers sont protégés par @RequireConsent
 */
test.describe('PR-C1: ConsentGuard on Critical Controllers', () => {
  /**
   * Helper: Créer un utilisateur et obtenir son token
   */
  async function createUserWithoutConsent(
    request: any,
    role: 'WORKER' | 'EMPLOYER',
    suffix: string,
  ) {
    const email = `${suffix}-${Date.now()}@test.com`;
    const signup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: {
        email,
        password: 'password123',
        name: `Test User ${suffix}`,
        role,
        ...(role === 'EMPLOYER' ? { companyName: 'Test Company' } : {}),
      },
    });
    const data = await signup.json();
    return { token: data.accessToken, userId: data.userId };
  }

  /**
   * Helper: Accepter les documents légaux pour un utilisateur
   */
  async function acceptAllConsent(request: any, token: string) {
    // Récupérer les versions actives
    const versionsResponse = await request.get(
      `${API_BASE_URL}/compliance/versions`,
    );
    const { versions } = await versionsResponse.json();

    // Accepter TERMS
    await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { documentType: 'TERMS', version: versions.TERMS },
    });

    // Accepter PRIVACY
    await request.post(`${API_BASE_URL}/compliance/accept`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { documentType: 'PRIVACY', version: versions.PRIVACY },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENTS CONTROLLER
  // ═══════════════════════════════════════════════════════════════
  test.describe('PaymentsController - ConsentGuard', () => {
    test('POST /payments/create-intent sans consentement → 403 CONSENT_REQUIRED', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'EMPLOYER',
        'payments-no-consent',
      );

      const response = await request.post(`${API_BASE_URL}/payments/create-intent`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { missionId: 'fake-mission-id' },
      });

      expect(response.status()).toBe(403);
      const error = await response.json();
      expect(error.error).toBe('CONSENT_REQUIRED');
    });

    test('POST /payments/create-intent avec consentement → passe le guard (peut échouer ensuite pour autre raison)', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'EMPLOYER',
        'payments-with-consent',
      );

      // Accepter le consentement
      await acceptAllConsent(request, token);

      const response = await request.post(`${API_BASE_URL}/payments/create-intent`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { missionId: 'fake-mission-id' },
      });

      // Le guard consent passe, donc on NE reçoit PAS 403 CONSENT_REQUIRED
      // On peut recevoir 400/404 pour mission non trouvée, mais PAS 403 CONSENT_REQUIRED
      if (response.status() === 403) {
        const error = await response.json();
        expect(error.error).not.toBe('CONSENT_REQUIRED');
      } else {
        // 400 (Stripe not configured) ou 404 (mission not found) sont acceptables
        expect([400, 404]).toContain(response.status());
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONTRACTS CONTROLLER
  // ═══════════════════════════════════════════════════════════════
  test.describe('ContractsController - ConsentGuard', () => {
    test('GET /contracts/user/me sans consentement → 403 CONSENT_REQUIRED', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'EMPLOYER',
        'contracts-no-consent',
      );

      const response = await request.get(`${API_BASE_URL}/contracts/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status()).toBe(403);
      const error = await response.json();
      expect(error.error).toBe('CONSENT_REQUIRED');
    });

    test('GET /contracts/user/me avec consentement → 200 OK', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'EMPLOYER',
        'contracts-with-consent',
      );

      // Accepter le consentement
      await acceptAllConsent(request, token);

      const response = await request.get(`${API_BASE_URL}/contracts/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Avec consentement, on reçoit 200 (liste vide car nouveau user)
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OFFERS CONTROLLER
  // ═══════════════════════════════════════════════════════════════
  test.describe('OffersController - ConsentGuard', () => {
    test('POST /offers sans consentement → 403 CONSENT_REQUIRED', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'WORKER',
        'offers-no-consent',
      );

      const response = await request.post(`${API_BASE_URL}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          missionId: 'fake-mission-id',
          proposedPrice: 100,
          message: 'Test offer',
        },
      });

      expect(response.status()).toBe(403);
      const error = await response.json();
      expect(error.error).toBe('CONSENT_REQUIRED');
    });

    test('GET /offers/:id sans consentement → 403 CONSENT_REQUIRED', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'WORKER',
        'offers-get-no-consent',
      );

      const response = await request.get(`${API_BASE_URL}/offers/fake-offer-id`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status()).toBe(403);
      const error = await response.json();
      expect(error.error).toBe('CONSENT_REQUIRED');
    });

    test('POST /offers avec consentement → passe le guard (peut échouer ensuite)', async ({
      request,
    }) => {
      const { token } = await createUserWithoutConsent(
        request,
        'WORKER',
        'offers-with-consent',
      );

      // Accepter le consentement
      await acceptAllConsent(request, token);

      const response = await request.post(`${API_BASE_URL}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          missionId: 'fake-mission-id',
          proposedPrice: 100,
          message: 'Test offer',
        },
      });

      // Avec consentement, on NE reçoit PAS 403 CONSENT_REQUIRED
      // On peut recevoir 400/404 pour mission non trouvée
      if (response.status() === 403) {
        const error = await response.json();
        expect(error.error).not.toBe('CONSENT_REQUIRED');
      } else {
        expect([400, 404]).toContain(response.status());
      }
    });
  });
});


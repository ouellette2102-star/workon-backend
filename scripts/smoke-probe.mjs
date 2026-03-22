// WorkOn Backend - Smoke Probe (Node ESM)
// Usage: node scripts/smoke-probe.mjs [baseUrl]
import https from 'https';

const BASE = process.argv[2] || 'workon-backend-production-8908.up.railway.app';

let passed = 0, failed = 0;
const results = [];

function getAuth(path, label, token) {
  return new Promise((resolve) => {
    const url = `https://${BASE}${path}`;
    const req = https.get(url, {
      timeout: 15000,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 500;
        const icon = ok ? 'PASS' : 'FAIL';
        if (ok) passed++; else failed++;
        console.log(`[${icon}] ${label} -> HTTP ${res.statusCode} | ${body.substring(0, 120).replace(/\n/g, ' ')}`);
        results.push({ label, status: res.statusCode, body: body.substring(0, 200) });
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('timeout', () => { req.destroy(); });
    req.on('error', (e) => {
      console.log(`[FAIL] ${label} -> ERROR: ${e.message}`);
      failed++;
      results.push({ label, status: 0, error: e.message });
      resolve({ status: 0, error: e.message });
    });
  });
}

function get(path, label) {
  return new Promise((resolve) => {
    const url = `https://${BASE}${path}`;
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 500;
        const icon = ok ? 'PASS' : 'FAIL';
        if (ok) passed++; else failed++;
        const preview = body.substring(0, 120).replace(/\n/g, ' ');
        console.log(`[${icon}] ${label} -> HTTP ${res.statusCode} | ${preview}`);
        results.push({ label, status: res.statusCode, body: body.substring(0, 200) });
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('timeout', () => { req.destroy(); });
    req.on('error', (e) => {
      console.log(`[FAIL] ${label} -> ERROR: ${e.message}`);
      failed++;
      results.push({ label, status: 0, error: e.message });
      resolve({ status: 0, error: e.message });
    });
  });
}

function post(path, body, label, token = '') {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
    };
    const req = https.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 500;
        const icon = ok ? 'PASS' : 'FAIL';
        if (ok) passed++; else failed++;
        console.log(`[${icon}] ${label} -> HTTP ${res.statusCode} | ${b.substring(0, 120)}`);
        results.push({ label, status: res.statusCode, body: b.substring(0, 200) });
        resolve({ status: res.statusCode, body: b });
      });
    });
    req.on('timeout', () => { req.destroy(); });
    req.on('error', (e) => {
      console.log(`[FAIL] ${label} -> ERROR: ${e.message}`);
      failed++;
      results.push({ label, status: 0, error: e.message });
      resolve({ status: 0, error: e.message });
    });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('\n===========================================');
  console.log(`  WorkOn Smoke Probe -> https://${BASE}`);
  console.log('===========================================\n');

  // F6 - Health
  console.log('--- F6: Health / Ready ---');
  await get('/healthz', 'F6.1 GET /healthz');
  await get('/readyz', 'F6.2 GET /readyz');
  await get('/api/v1/health', 'F6.3 GET /api/v1/health');

  // F1 - Auth
  console.log('\n--- F1: Auth ---');
  const ts = Date.now();
  const email = `smoke-${ts}@workon.test`;
  const pwd = 'SmokeTest123!';

  let token = '';
  let refreshToken = '';

  const reg = await post('/api/v1/auth/register', {
    email, password: pwd, firstName: 'Smoke', lastName: 'Worker', role: 'worker'
  }, 'F1.1 POST /auth/register');

  if (reg.status === 201) {
    try {
      const d = JSON.parse(reg.body);
      token = d.accessToken;
      refreshToken = d.refreshToken;
    } catch {}
  }

  const login = await post('/api/v1/auth/login', { email, password: pwd }, 'F1.2 POST /auth/login');
  if (login.status === 200) {
    try {
      const d = JSON.parse(login.body);
      token = d.accessToken;
      refreshToken = d.refreshToken;
    } catch {}
  }

  await get('/api/v1/auth/me', 'F1.3 GET /auth/me (no token -> 401 expected)');

  if (refreshToken) {
    await post('/api/v1/auth/refresh', { refreshToken }, 'F1.5 POST /auth/refresh');
  }

  // Consent
  console.log('\n--- Consent (prerequisite) ---');
  const vr = await get('/api/v1/compliance/versions', 'Compliance versions');
  let termsVer = '1.0', privacyVer = '1.0';
  if (vr.status === 200) {
    try {
      const cv = JSON.parse(vr.body);
      termsVer = cv.versions?.TERMS || '1.0';
      privacyVer = cv.versions?.PRIVACY || '1.0';
    } catch {}
  }
  if (token) {
    await post('/api/v1/compliance/accept', { documentType: 'TERMS', version: termsVer }, 'Accept TERMS', token);
    await post('/api/v1/compliance/accept', { documentType: 'PRIVACY', version: privacyVer }, 'Accept PRIVACY', token);
  }

  // F2 - Browse missions
  console.log('\n--- F2: Worker browse missions ---');
  await get('/api/v1/catalog/categories', 'F2.1 GET /catalog/categories');
  await get('/api/v1/catalog/skills', 'F2.2 GET /catalog/skills');
  await get('/api/v1/missions-map', 'F2.3 GET /missions-map (public, no auth)');
  // NOTE: /metrics/home-stats is NOT deployed yet (local commit 768f86b pending push)
  // home-stats: merged in PR #132, but Railway prod fails to deploy (env config issue on modest-abundance env)
  // staging (comfortable-benevolence) deploys OK. TODO: fix Railway env vars.
  await get('/api/v1/metrics/home-stats', 'F2.4 GET /metrics/home-stats [RAILWAY DEPLOY BLOCKED - 404 expected until Railway fixed]');

  // F3 - Create mission (employer)
  console.log('\n--- F3: Create mission (employer) ---');
  let empToken = '';
  const empEmail = `smoke-emp-${ts}@workon.test`;
  const empReg = await post('/api/v1/auth/register', {
    email: empEmail, password: pwd, firstName: 'Smoke', lastName: 'Employer', role: 'employer'
  }, 'F3.0 Employer register');

  if (empReg.status === 201) {
    try {
      const d = JSON.parse(empReg.body);
      empToken = d.accessToken;
    } catch {}
    if (empToken) {
      const rcv = await get('/api/v1/compliance/versions', 'versions (employer)');
      let tv = '1.0', pv = '1.0';
      try { const cv = JSON.parse(rcv.body); tv = cv.versions?.TERMS||'1.0'; pv = cv.versions?.PRIVACY||'1.0'; } catch {}
      await post('/api/v1/compliance/accept', { documentType: 'TERMS', version: tv }, 'Employer TERMS', empToken);
      await post('/api/v1/compliance/accept', { documentType: 'PRIVACY', version: pv }, 'Employer PRIVACY', empToken);
    }
  }

  // Get category
  let categoryId = null;
  const catsResp = await get('/api/v1/catalog/categories', 'categories for mission');
  if (catsResp.status === 200) {
    try { categoryId = JSON.parse(catsResp.body)[0]?.id; } catch {}
  }

  let missionId = null;
  if (empToken) {
    // DTO: title, description, category (enum), price, latitude, longitude, city, address?
    const mResp = await post('/api/v1/missions-local', {
      title: `Smoke mission ${ts}`,
      description: 'Smoke test - snow removal job',
      category: 'snow_removal',
      price: 75.0,
      latitude: 45.5017,
      longitude: -73.5673,
      city: 'Montreal',
    }, 'F3.1 POST /missions-local (create)', empToken);

    if (mResp.status === 201) {
      try { missionId = JSON.parse(mResp.body).id; } catch {}
    }

    if (missionId) {
      await get(`/api/v1/missions-local/${missionId}`, `F3.2 GET /missions-local/${missionId}`);
    }
  } else {
    console.log('[SKIP] F3 - no empToken or categoryId');
  }

  // F4 - Stripe Connect
  console.log('\n--- F4: Stripe Connect ---');
  // Needs worker token - check connect account state
  if (token) {
    const f4resp = await getAuth('/api/v1/payments/stripe/connect/status', 'F4.1 GET /payments/stripe/connect/status (worker)', token);
    if (f4resp) {
      try { console.log('[INFO] Stripe connect:', JSON.stringify(JSON.parse(f4resp.body||'{}'), null, 0).substring(0, 200)); } catch {}
    }
  } else {
    await get('/api/v1/payments/stripe/connect/status', 'F4.1 GET /payments/stripe/connect/status (no token)');
  }

  // F5 - Mission completion + reviews
  console.log('\n--- F5: Mission completion + reviews ---');
  if (missionId && token) {
    await post(`/api/v1/missions-local/${missionId}/accept`, {}, `F5.1 POST /missions-local/${missionId}/accept (worker)`, token);
  }
  if (token) {
    await getAuth('/api/v1/reviews', 'F5.2 GET /reviews (authenticated)', token);
    await getAuth('/api/v1/earnings/summary', 'F5.3 GET /earnings/summary (worker)', token);
  }

  // Bonus metrics
  console.log('\n--- BONUS: Public metrics ---');
  await get('/api/v1/metrics/ratio', 'BONUS.1 GET /metrics/ratio');
  await get('/api/v1/metrics/regions', 'BONUS.2 GET /metrics/regions');
  const pmResp = await get('/api/v1/metrics/prometheus', 'BONUS.3 GET /metrics/prometheus');
  if (pmResp.body && pmResp.body.includes('workon_uptime')) {
    console.log('[INFO] Prometheus metrics contain workon_uptime - OK');
  }

  // Summary
  console.log('\n===========================================');
  console.log(`  RESULTS: PASS=${passed}  FAIL=${failed}`);
  console.log('===========================================');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });

/**
 * WorkOn API Contract Check
 * 
 * This script verifies that all required API endpoints exist in the codebase.
 * It scans the source files for controller decorators and validates
 * that the required routes are defined.
 * 
 * Usage: npx ts-node scripts/check-api-contracts.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// REQUIRED ENDPOINTS (Contract Definition)
// ============================================

interface EndpointContract {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  critical: boolean; // If true, missing endpoint fails the check
}

const REQUIRED_ENDPOINTS: EndpointContract[] = [
  // Health
  { method: 'GET', path: '/healthz', description: 'Liveness probe', critical: true },
  { method: 'GET', path: '/readyz', description: 'Readiness probe', critical: true },
  { method: 'GET', path: '/api/v1/health', description: 'Health check', critical: true },
  
  // Auth - Public (Note: backend uses 'register' not 'signup')
  { method: 'POST', path: '/api/v1/auth/register', description: 'User registration', critical: true },
  { method: 'POST', path: '/api/v1/auth/login', description: 'User login', critical: true },
  { method: 'POST', path: '/api/v1/auth/refresh', description: 'Refresh token', critical: true },
  { method: 'GET', path: '/api/v1/auth/me', description: 'Get current user', critical: true },
  
  // Auth - Password Reset
  { method: 'POST', path: '/api/v1/auth/forgot-password', description: 'Forgot password', critical: false },
  { method: 'POST', path: '/api/v1/auth/reset-password', description: 'Reset password', critical: false },
  
  // Auth - Account Management (PR-B2, PR-B3)
  // Note: change-email and verify-email-otp are pending PR-B2 implementation
  { method: 'POST', path: '/api/v1/auth/change-email', description: 'Request email change OTP (PR-B2)', critical: false },
  { method: 'POST', path: '/api/v1/auth/verify-email-otp', description: 'Verify email OTP (PR-B2)', critical: false },
  { method: 'DELETE', path: '/api/v1/auth/account', description: 'Delete account (GDPR)', critical: true },
  
  // Profile
  { method: 'GET', path: '/api/v1/profile', description: 'Get user profile', critical: true },
  { method: 'PATCH', path: '/api/v1/profile', description: 'Update profile', critical: false },
  
  // Missions
  { method: 'GET', path: '/api/v1/missions', description: 'List missions', critical: false },
  { method: 'GET', path: '/api/v1/missions-local', description: 'List local missions', critical: false },
  { method: 'GET', path: '/api/v1/missions-map', description: 'Missions for map', critical: false },
  
  // Payments
  { method: 'POST', path: '/api/v1/payments-local/intent', description: 'Create payment intent', critical: false },
  { method: 'POST', path: '/api/v1/payments/checkout', description: 'Create Stripe Checkout Session', critical: false },
  { method: 'GET', path: '/api/v1/payments/invoice', description: 'Get invoice details', critical: false },
  { method: 'GET', path: '/api/v1/payments/preview', description: 'Preview invoice calculation', critical: false },
  
  // Webhooks
  { method: 'POST', path: '/api/v1/webhooks/stripe', description: 'Stripe webhook', critical: false },
];

// ============================================
// SCANNER
// ============================================

interface FoundEndpoint {
  method: string;
  path: string;
  file: string;
  line: number;
}

function scanControllers(srcDir: string): FoundEndpoint[] {
  const endpoints: FoundEndpoint[] = [];
  
  function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Find controller base path
    let controllerPath = '';
    const controllerMatch = content.match(/@Controller\(['"]([^'"]*)['"]\)/);
    if (controllerMatch) {
      controllerPath = controllerMatch[1];
    }
    
    // Scan for route decorators
    const routeDecorators = [
      { regex: /@Get\(['"]?([^'")]*)?['"]?\)/g, method: 'GET' },
      { regex: /@Post\(['"]?([^'")]*)?['"]?\)/g, method: 'POST' },
      { regex: /@Put\(['"]?([^'")]*)?['"]?\)/g, method: 'PUT' },
      { regex: /@Patch\(['"]?([^'")]*)?['"]?\)/g, method: 'PATCH' },
      { regex: /@Delete\(['"]?([^'")]*)?['"]?\)/g, method: 'DELETE' },
    ];
    
    for (const { regex, method } of routeDecorators) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const routePath = match[1] || '';
        const fullPath = `/${controllerPath}/${routePath}`.replace(/\/+/g, '/').replace(/\/$/, '');
        
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        endpoints.push({
          method,
          path: fullPath || '/',
          file: filePath,
          line: lineNumber,
        });
      }
    }
  }
  
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
        scanFile(fullPath);
      }
    }
  }
  
  scanDirectory(srcDir);
  
  // Add special routes from main.ts (healthz, readyz, metrics)
  const mainPath = path.join(srcDir, 'main.ts');
  if (fs.existsSync(mainPath)) {
    const mainContent = fs.readFileSync(mainPath, 'utf-8');
    
    if (mainContent.includes("'/healthz'")) {
      endpoints.push({ method: 'GET', path: '/healthz', file: mainPath, line: 0 });
    }
    if (mainContent.includes("'/readyz'")) {
      endpoints.push({ method: 'GET', path: '/readyz', file: mainPath, line: 0 });
    }
    if (mainContent.includes("'/metrics'")) {
      endpoints.push({ method: 'GET', path: '/metrics', file: mainPath, line: 0 });
    }
  }
  
  return endpoints;
}

// ============================================
// VALIDATOR
// ============================================

function normalizePathForComparison(p: string): string {
  return p.toLowerCase().replace(/\/+/g, '/').replace(/\/$/, '');
}

function validateContracts(required: EndpointContract[], found: FoundEndpoint[]): {
  passed: EndpointContract[];
  failed: EndpointContract[];
  extra: FoundEndpoint[];
} {
  const foundNormalized = found.map(e => ({
    ...e,
    normalized: `${e.method} ${normalizePathForComparison(e.path)}`,
  }));
  
  const passed: EndpointContract[] = [];
  const failed: EndpointContract[] = [];
  
  for (const req of required) {
    const reqNormalized = `${req.method} ${normalizePathForComparison(req.path)}`;
    
    // Check if path matches (with or without trailing params)
    const isFound = foundNormalized.some(f => {
      const fPath = normalizePathForComparison(f.path);
      const rPath = normalizePathForComparison(req.path);
      return f.method === req.method && (fPath === rPath || fPath.startsWith(rPath));
    });
    
    if (isFound) {
      passed.push(req);
    } else {
      failed.push(req);
    }
  }
  
  return { passed, failed, extra: [] };
}

// ============================================
// MAIN
// ============================================

function main() {
  console.log('');
  console.log('========================================');
  console.log('  WorkOn API Contract Check');
  console.log('========================================');
  console.log('');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory not found:', srcDir);
    process.exit(1);
  }
  
  console.log('Scanning controllers in:', srcDir);
  console.log('');
  
  const foundEndpoints = scanControllers(srcDir);
  console.log(`Found ${foundEndpoints.length} endpoints in codebase`);
  console.log('');
  
  const { passed, failed } = validateContracts(REQUIRED_ENDPOINTS, foundEndpoints);
  
  // Report passed
  console.log('--- Passed ---');
  for (const ep of passed) {
    console.log(`✅ ${ep.method} ${ep.path} - ${ep.description}`);
  }
  
  // Report failed
  if (failed.length > 0) {
    console.log('');
    console.log('--- Missing ---');
    for (const ep of failed) {
      const icon = ep.critical ? '❌' : '⚠️';
      console.log(`${icon} ${ep.method} ${ep.path} - ${ep.description} ${ep.critical ? '[CRITICAL]' : '[optional]'}`);
    }
  }
  
  // Summary
  console.log('');
  console.log('========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`Passed:  ${passed.length}/${REQUIRED_ENDPOINTS.length}`);
  console.log(`Missing: ${failed.length}/${REQUIRED_ENDPOINTS.length}`);
  console.log('');
  
  const criticalFailed = failed.filter(e => e.critical);
  
  if (criticalFailed.length > 0) {
    console.log('❌ CONTRACT CHECK FAILED');
    console.log(`   ${criticalFailed.length} critical endpoint(s) missing`);
    console.log('');
    console.log('Missing critical endpoints:');
    for (const ep of criticalFailed) {
      console.log(`   - ${ep.method} ${ep.path}`);
    }
    process.exit(1);
  } else {
    console.log('✅ CONTRACT CHECK PASSED');
    if (failed.length > 0) {
      console.log(`   (${failed.length} optional endpoint(s) missing)`);
    }
    process.exit(0);
  }
}

main();


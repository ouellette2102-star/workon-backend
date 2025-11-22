#!/usr/bin/env node
/**
 * Generate a minimal .env file for development
 * 
 * Usage: node scripts/generate-env.js
 * 
 * This script creates a backend/.env file with all required variables
 * for development mode. It reads the Clerk key from .clerk/.tmp/keyless.json
 * if available.
 */

const fs = require('fs');
const path = require('path');

// Read Clerk key from keyless.json if it exists
let clerkSecretKey = 'sk_test_YOUR_CLERK_SECRET_KEY';
try {
  const clerkKeylessPath = path.join(__dirname, '../../.clerk/.tmp/keyless.json');
  if (fs.existsSync(clerkKeylessPath)) {
    const keylessData = JSON.parse(fs.readFileSync(clerkKeylessPath, 'utf8'));
    clerkSecretKey = keylessData.secretKey || clerkSecretKey;
    console.log('✅ Found Clerk secret key in .clerk/.tmp/keyless.json');
  }
} catch (error) {
  console.warn('⚠️  Could not read Clerk key from keyless.json, using placeholder');
}

const envContent = `# ========================================
# WorkOn Backend - Development Environment
# ========================================
# Generated automatically by scripts/generate-env.js
# Last updated: ${new Date().toISOString()}

# ========================================
# REQUIRED VARIABLES (ALL ENVIRONMENTS)
# ========================================

# Database connection (PostgreSQL)
# For Docker: postgresql://postgres:workon@localhost:5432/workon
# For local PostgreSQL: postgresql://postgres:YOUR_PASSWORD@localhost:5432/workon_dev
DATABASE_URL=postgresql://postgres:workon@localhost:5432/workon

# Clerk authentication
# Loaded from .clerk/.tmp/keyless.json
CLERK_SECRET_KEY=${clerkSecretKey}

# Environment mode
NODE_ENV=development

# ========================================
# OPTIONAL VARIABLES (DEVELOPMENT)
# ========================================

# Server port (default: 3001)
PORT=3001

# Frontend URL for CORS (optional in dev - auto-allows localhost)
CORS_ORIGIN=http://localhost:3000

# JWT Secret for local auth (auto-generated in dev)
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Clerk issuer (optional - auto-detected)
# CLERK_ISSUER=https://your-app.clerk.accounts.dev

# ========================================
# OPTIONAL: PAYMENT (STRIPE)
# ========================================
# Not required in development

# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# ========================================
# OPTIONAL: MONITORING (SENTRY)
# ========================================
# Not required in development

# SENTRY_DSN=https://...
# SENTRY_ENVIRONMENT=development

# ========================================
# OPTIONAL: RATE LIMITING
# ========================================

THROTTLE_LIMIT=20
THROTTLE_TTL=60

# ========================================
# OPTIONAL: LOGGING
# ========================================

LOG_LEVEL=info

# ========================================
# NOTES
# ========================================
# - DATABASE_URL: Update with your PostgreSQL credentials
# - CLERK_SECRET_KEY: Auto-loaded from Clerk CLI
# - All other vars are optional in development
# - For production setup, see backend/SECURITY.md
`;

// Write .env file
const envPath = path.join(__dirname, '../.env');
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('\n✅ Created backend/.env with minimal development configuration');
console.log('\n📋 Required variables set:');
console.log('   - DATABASE_URL: postgresql://postgres:postgres@localhost:5432/workon_dev');
console.log('   - CLERK_SECRET_KEY: ' + (clerkSecretKey.startsWith('sk_test_') ? 'sk_test_...' : 'PLACEHOLDER'));
console.log('   - NODE_ENV: development');
console.log('\n💡 Next steps:');
console.log('   1. Update DATABASE_URL in .env with your PostgreSQL credentials');
console.log('   2. Run: npm run start:dev');
console.log('\n');


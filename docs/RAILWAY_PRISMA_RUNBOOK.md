# Railway + Prisma Migration Runbook

## Overview

This document describes how to handle Prisma migrations on Railway, including incident recovery for P3009 (failed migration) errors.

## Current Incident: P3009 Failed Migration

**Status:** Active fix in PR  
**Failed Migration:** `20251202201222_add_messages_contracts`  
**Symptom:** `POST /api/v1/auth/register` returns 500  
**Root Cause:** Migration marked FAILED blocks all subsequent migrations

## How Railway Runs Migrations

Railway uses `railway.json` to configure deployment:

```json
{
  "deploy": {
    "releaseCommand": "node scripts/railway-release.js",
    "startCommand": "node dist/main.js"
  }
}
```

**Order of execution:**
1. `buildCommand` runs during build phase
2. `releaseCommand` runs BEFORE the app starts (migrations here)
3. `startCommand` starts the application
4. `healthcheckPath` is checked to verify deployment success

## Deploy Instructions (Human Actions)

### Step 1: Merge the PR

Merge `fix/prisma-p3009-migration-resolve` to `main`.

### Step 2: Monitor Railway Deploy

1. Go to Railway Dashboard → `workon-backend`
2. Watch the **Deploy Logs**
3. Look for these log lines:

**Expected Success Logs:**
```
[railway-release] Starting Railway release phase
[railway-release] Checking Prisma migration status...
[railway-release] ⚠️  P3009 detected: Failed migration blocking deploy
[railway-release] Attempting to resolve migration 20251202201222_add_messages_contracts as applied...
[railway-release] Resolve migration as applied completed successfully
[railway-release] ✅ Migration resolved successfully
[railway-release] Running prisma migrate deploy...
[railway-release] Prisma migrate deploy completed successfully
[railway-release] ✅ Railway release phase completed successfully
```

**If you see errors:**
```
[railway-release] ❌ Failed to resolve migration. Manual intervention required.
```
→ Contact engineering team for manual DB intervention.

### Step 3: Verify Endpoints

After successful deploy, test:

```bash
# Health check
curl https://workon-backend-production-8908.up.railway.app/healthz
# Expected: 200 OK

# Registration
curl -X POST https://workon-backend-production-8908.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-deploy@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'
# Expected: 201 Created
```

## Rollback Procedure

If the deployment fails or causes issues:

### Option A: Revert PR (Preferred)

1. Go to GitHub → merged PR
2. Click "Revert" to create a revert PR
3. Merge the revert PR
4. Railway will auto-deploy the reverted code

### Option B: Manual Rollback in Railway

1. Railway Dashboard → `workon-backend` → Deployments
2. Find the last successful deployment
3. Click "Rollback" to redeploy that version

## Post-Incident: Simplify Release Command

After the incident is resolved (migrations applied successfully), update `railway.json`:

```json
{
  "deploy": {
    "releaseCommand": "npx prisma migrate deploy"
  }
}
```

This removes the P3009 workaround since it's no longer needed.

## Prevention Checklist

- [ ] Always test migrations in staging first
- [ ] Never run `prisma migrate reset` on production
- [ ] Never run `prisma db push` on production
- [ ] Use `prisma migrate deploy` for production deployments
- [ ] Monitor deploy logs for migration errors

## Common Errors

### P3009: Failed Migration

**Cause:** A migration was interrupted or failed mid-execution.

**Fix:** Use `prisma migrate resolve`:
```bash
# If DDL was applied:
npx prisma migrate resolve --applied <migration_name>

# If DDL was NOT applied:
npx prisma migrate resolve --rolled-back <migration_name>
```

### P1001: Can't reach database

**Cause:** DATABASE_URL is incorrect or DB is down.

**Fix:** Check Railway environment variables.

### Schema Drift

**Cause:** DB schema doesn't match Prisma schema.

**Fix:** Run `prisma migrate deploy` to apply pending migrations.

## Support

For issues not covered here, contact the engineering team with:
- Deploy logs
- Error messages
- Railway environment (staging/production)


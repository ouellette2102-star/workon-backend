# SOP: Railway Deployment -- WorkOn Backend
> Version: 1.0
> Date: 2026-03-27
> Owner: Engineering
> Applies to: Production and Staging environments

---

## 1. Overview

This Standard Operating Procedure covers all deployment activities for the WorkOn NestJS backend hosted on Railway. It covers routine deployments, hotfixes, database migrations, rollbacks, and incident procedures.

### Environment Map

| Environment | Railway Project | URL | Branch | DB |
|-------------|----------------|-----|--------|-----|
| Production | `modest-abundance` | `workon-backend-production-8908.up.railway.app` | `main` | PostgreSQL (Railway) |
| N8N | `comfortable-benevolence` | `n8n-production-9b4ce.up.railway.app` | -- | Internal |

---

## 2. Standard Deployment (PR Merge to Main)

### Pre-Deployment Checklist

- [ ] All CI checks pass (lint + tests) on the PR
- [ ] PR has been reviewed (or self-reviewed with documented rationale)
- [ ] No breaking API changes without frontend coordination
- [ ] Database migration (if any) has been tested locally
- [ ] Environment variables (if new ones required) have been added to Railway
- [ ] Changelog entry written (if significant change)

### Deployment Steps

**Step 1: Merge PR to main**
```
# On GitHub: Merge PR via "Squash and Merge" (preferred) or "Merge commit"
# Railway auto-deploys from main branch
```

**Step 2: Monitor Railway Build**
1. Open Railway dashboard: https://railway.app
2. Navigate to project `modest-abundance`
3. Watch the build log for errors
4. Build typically takes 2-4 minutes
5. Confirm "Deploy successful" status

**Step 3: Verify Deployment**
```bash
# Health check
curl https://workon-backend-production-8908.up.railway.app/hz

# Expected response: {"status":"ok"} or similar 200 response

# If the deployment includes new endpoints, test them:
curl https://workon-backend-production-8908.up.railway.app/api/v1/public/stats
```

**Step 4: Verify Database Migration (if applicable)**
```bash
# Railway runs `prisma migrate deploy` automatically during build
# Check Railway build logs for:
#   "X migrations found in prisma/migrations"
#   "X migrations have been applied"
# No manual intervention needed for standard migrations
```

**Step 5: Post-Deploy Verification**
- [ ] Health endpoint returns 200
- [ ] Key API endpoints respond correctly
- [ ] N8N webhooks still functional (test a GHL form submission if possible)
- [ ] Stripe webhook endpoint accessible
- [ ] No error spikes in Railway logs

---

## 3. Hotfix Deployment

Use for critical production bugs that cannot wait for normal PR cycle.

### Hotfix Steps

**Step 1: Create hotfix branch**
```bash
git checkout main
git pull origin main
git checkout -b fix/description-of-fix
```

**Step 2: Apply fix**
- Make minimal, targeted changes
- Add a test if possible
- Run local tests: `npm run test`

**Step 3: Create PR with `[HOTFIX]` prefix**
```bash
git push origin fix/description-of-fix
# Create PR titled: [HOTFIX] Description of the fix
# Mark as urgent in PR description
```

**Step 4: Fast-track merge**
- Self-review is acceptable for hotfixes
- Ensure CI passes
- Merge immediately
- Monitor deployment (same as standard deployment steps 2-5)

**Step 5: Document**
- Create incident report if user-facing impact: `docs/incidents/YYYY-MM-DD-description.md`
- Update changelog

---

## 4. Database Migration Deployment

### Standard Migration (Non-Breaking)

Non-breaking migrations add columns, tables, or indexes without modifying existing data structure.

**Step 1: Create migration locally**
```bash
npx prisma migrate dev --name descriptive_migration_name
```

**Step 2: Review generated SQL**
```bash
# Check prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/migration.sql
# Verify:
# - No DROP statements unless intentional
# - No data loss risk
# - Indexes added for new foreign keys
```

**Step 3: Test locally**
```bash
npx prisma migrate deploy  # Apply to local DB
npm run test                # Ensure tests pass
```

**Step 4: Deploy via PR**
- Include migration files in the PR
- Railway runs `prisma migrate deploy` automatically during build
- Prisma applies only unapplied migrations

### Breaking Migration (Schema Change)

Breaking migrations alter or remove existing columns/tables.

**Step 1: Plan the migration**
- Document what changes and why
- Identify affected API endpoints
- Plan data migration if needed

**Step 2: Two-phase approach (recommended)**
```
Phase 1 PR: Add new column/table alongside old one
  - Deploy Phase 1
  - Verify old + new structure coexist

Phase 2 PR: Remove old column/table, update code to use new
  - Deploy Phase 2
  - Verify everything uses new structure
```

**Step 3: Backup before breaking changes**
```bash
# Railway PostgreSQL backup
# Option A: Use Railway's built-in backup (check dashboard)
# Option B: Manual pg_dump via Railway proxy
railway connect postgres
pg_dump $DATABASE_URL > backup_YYYYMMDD.sql
```

---

## 5. Environment Variables

### Adding New Variables

**Step 1: Add to Railway**
1. Railway Dashboard -> Project -> Service -> Variables
2. Add key-value pair
3. Railway will auto-redeploy

**Step 2: Document**
- Add to `docs/RAILWAY_ENV_SETUP.md`
- Add to `.env.example` (without real values)

### Current Required Variables
| Variable | Purpose | Example |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection | `postgresql://...` |
| JWT_SECRET | Access token signing | Random 64-char string |
| JWT_REFRESH_SECRET | Refresh token signing | Random 64-char string |
| STRIPE_SECRET_KEY | Stripe API | `sk_live_...` |
| STRIPE_WEBHOOK_SECRET | Stripe webhook verification | `whsec_...` |
| NODE_ENV | Environment flag | `production` |
| PORT | Server port | `3000` (Railway default) |

---

## 6. Rollback Procedure

### Code Rollback (Revert Last Deploy)

**Option A: Revert commit on main**
```bash
git checkout main
git pull origin main
git revert HEAD          # Creates a new commit that undoes the last one
git push origin main     # Railway auto-deploys the revert
```

**Option B: Railway redeploy previous version**
1. Railway Dashboard -> Deployments
2. Find the last known-good deployment
3. Click "Redeploy" on that version

### Database Rollback

**If migration was non-breaking (additive only):**
- No rollback needed. New columns/tables are harmless.
- Fix the code issue and redeploy.

**If migration was breaking:**
1. Restore from backup (see Section 4)
2. Revert the migration PR
3. Redeploy
4. Verify data integrity

---

## 7. Monitoring & Alerts

### Health Checks
- **Endpoint**: `GET /hz`
- **Expected**: 200 OK
- **Monitoring**: Railway built-in (restart on crash)
- **Recommended**: Set up external uptime monitor (UptimeRobot, Better Uptime)

### Log Monitoring
- Railway Dashboard -> Logs (real-time)
- Filter for `ERROR`, `WARN`, `FATAL`
- Key patterns to watch:
  - `PrismaClientKnownRequestError` -- Database issues
  - `UnauthorizedException` -- Auth issues (expected for bad tokens)
  - `ECONNREFUSED` -- Database connection lost
  - `Stripe webhook signature verification failed` -- Webhook issues

### Performance Baselines
| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| API response (p95) | < 500ms | > 2000ms |
| Memory usage | < 256MB | > 450MB |
| CPU usage | < 30% | > 80% |
| Build time | 2-4 min | > 8 min |
| Error rate | < 1% | > 5% |

---

## 8. Incident Response

### Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| SEV-1 | Service down, all users affected | Immediate | Backend crash, DB down |
| SEV-2 | Major feature broken, workaround exists | < 1 hour | Payment processing failed |
| SEV-3 | Minor feature broken, low impact | < 4 hours | One API endpoint returning errors |
| SEV-4 | Cosmetic or non-blocking | Next business day | Log noise, minor UI issue |

### SEV-1 Response

1. **Assess**: Check Railway dashboard for build/deploy failures
2. **Communicate**: Notify stakeholders (if applicable)
3. **Mitigate**: Rollback to last known-good deployment (Section 6)
4. **Investigate**: Check logs for root cause
5. **Fix**: Apply hotfix (Section 3)
6. **Document**: Write incident report in `docs/incidents/`

---

## 9. Maintenance Windows

### Recommended Schedule
- **Database maintenance**: Saturday 2:00-4:00 AM ET (low traffic)
- **Major migrations**: Deploy during low-traffic hours
- **Dependency updates**: Weekly, via dedicated PR

### Pre-Maintenance Checklist
- [ ] Backup database
- [ ] Notify team
- [ ] Have rollback plan ready
- [ ] Test changes in local environment first

---

## 10. Useful Commands Reference

```bash
# Local development
npm run start:dev          # Start with hot reload
npm run test               # Run all tests
npm run test:cov           # Run tests with coverage
npx prisma studio          # Open Prisma GUI
npx prisma migrate dev     # Create new migration

# Database
npx prisma migrate deploy  # Apply migrations (production)
npx prisma db push         # Push schema without migration (dev only)
npx prisma generate        # Regenerate Prisma client

# Railway CLI (if installed)
railway login              # Authenticate
railway link               # Link to project
railway logs               # Stream logs
railway connect postgres   # Connect to DB via proxy

# Git workflow
git checkout -b feat/description    # New feature branch
git checkout -b fix/description     # Hotfix branch
git push origin branch-name         # Push for PR
```

---

## 11. Contacts & Escalation

| Role | Responsibility | Escalation |
|------|---------------|------------|
| Developer on call | First responder for SEV-1/2 | -- |
| CEO / Founder | Business-critical decisions | SEV-1 only |
| Railway Support | Infrastructure issues | https://railway.app/support |
| Stripe Support | Payment issues | https://support.stripe.com |

---

*This SOP should be reviewed and updated monthly, or after any significant infrastructure change.*

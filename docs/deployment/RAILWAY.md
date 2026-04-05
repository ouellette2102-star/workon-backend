# Railway Deployment Guide - WorkOn Backend

## Overview

The backend is a NestJS + Prisma + PostgreSQL application deployed on Railway with automatic deploys from the `main` branch.

**Build pipeline:**
1. `npm install` -- install dependencies
2. `npx prisma generate` -- generate Prisma client
3. `npm run build` -- compile TypeScript (`nest build`)
4. `npx prisma migrate deploy` -- run production migrations
5. `npm run start:prod` -- start the server (`node dist/main`)

**Railway auto-provisions:**
- `DATABASE_URL` (from the PostgreSQL plugin)
- `PORT` (assigned by Railway)
- `RAILWAY_PUBLIC_DOMAIN` (public hostname)

Reference these in Railway variables with `${{VARIABLE_NAME}}` syntax.

---

## Required Environment Variables

### Mandatory

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-injected by Railway PostgreSQL plugin (`${{Postgres.DATABASE_URL}}`) |
| `NODE_ENV` | Set to `production` |
| `JWT_SECRET` | Min 32 chars. Generate: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Separate secret for refresh tokens |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `30d` |
| `CORS_ORIGIN` | Comma-separated allowed origins. e.g. `${{RAILWAY_PUBLIC_DOMAIN}},https://yourapp.flutterflow.app` |

### Conditional (enable per feature)

| Variable | When needed |
|----------|-------------|
| `CLERK_SECRET_KEY` | Clerk auth enabled |
| `CLERK_PUBLISHABLE_KEY` | Clerk auth enabled |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_PREFIX` | `api/v1` | URL prefix |
| `ENABLE_SWAGGER_PROD` | `false` | Expose `/api/docs` in production |
| `FRONTEND_URL` | -- | Primary frontend URL |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `THROTTLE_TTL` | `60` | Rate-limit window (seconds) |
| `THROTTLE_LIMIT` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `SENTRY_DSN` | -- | Error monitoring |

---

## Deploy Commands

### Railway Settings

**Build Command:**
```
npm install && npx prisma generate && npm run build
```

**Start Command:**
```
npx prisma migrate deploy && npm run start:prod
```

### Triggering a deploy

Railway redeploys automatically on every push to `main`. To force a redeploy:

```bash
git commit --allow-empty -m "trigger deploy"
git push origin main
```

Or use the Railway dashboard: Deployments > Deploy.

### Rollback

Railway dashboard > Deployments > find the last working deploy > Rollback.

---

## Health Checks and Probes

The app exposes a health endpoint used by Railway for liveness checks:

```
GET /healthz  ->  {"status":"ok","timestamp":"..."}
```

Railway pings this endpoint automatically. For external monitoring, point an uptime service (e.g. UptimeRobot) at `https://<domain>.up.railway.app/healthz`.

Additional verification endpoints:
- `GET /api/v1/health` -- API-level health
- `GET /api/docs` -- Swagger UI (when `ENABLE_SWAGGER_PROD=true`)

---

## Deployment Configuration

### nixpacks.toml

```toml
[start]
cmd = "npx prisma migrate deploy && npm run start:prod"
```

Migrations must succeed before the app starts. If `migrate deploy` fails, the container will not start.

### Port binding

The app reads `process.env.PORT` (injected by Railway) and falls back to `3001`:

```typescript
const port = configService.get<number>('PORT', 3001);
```

No manual port configuration is needed.

### Automatic deploys

Railway watches the `main` branch by default. Disable via Settings > Deployments > Watch Paths.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| 502 Bad Gateway | App crashed or wrong port | Check logs; verify `main.ts` reads `process.env.PORT` |
| `DATABASE_URL not found` | PostgreSQL plugin not linked | Add PostgreSQL in Railway and link to the service |
| `Prisma Client not generated` | Missing build step | Set build command to `npm install && npx prisma generate && npm run build` |
| Migration fails | Schema mismatch or connection error | Run manually: Railway Shell > `npx prisma migrate deploy` |
| CORS errors | Missing origin in allowlist | Add the calling domain to `CORS_ORIGIN` |
| `JWT_SECRET is not defined` | Missing env var | Add `JWT_SECRET` in Railway Variables |
| Tables missing after deploy | Migrations did not run | Check logs for `prisma migrate deploy` output; run manually via `railway run npx prisma migrate deploy` |

### Viewing logs

**Dashboard:** Service > Deployments > select a deploy.

**CLI:**
```bash
npm i -g @railway/cli
railway login
railway logs --follow
```

### Manual migration via Railway Shell

Railway > Service > Shell:
```bash
npx prisma migrate deploy
```

### Checking the database

```bash
railway run npx prisma db pull
```

This shows the current live schema and confirms which database `DATABASE_URL` points to.

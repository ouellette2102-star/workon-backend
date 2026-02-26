# AGENTS.md

## Cursor Cloud specific instructions

**WorkOn** is a NestJS backend API (services marketplace for freelance workers in Quebec). It uses PostgreSQL via Prisma ORM.

### Required system dependencies

- **Node.js 20.x LTS** (install via `nvm install 20 && nvm use 20`)
- **PostgreSQL 16** (install via `apt-get install -y postgresql postgresql-client`)

### Starting PostgreSQL

```bash
sudo pg_ctlcluster 16 main start
```

The dev database is created with user `workon` / password `workon_password` on port 5432, database `workon`.

### Environment

A `.env` file is required at the project root. Copy from `env.example` and set at minimum:

- `DATABASE_URL=postgresql://workon:workon_password@localhost:5432/workon?schema=public`
- `NODE_ENV=development`
- JWT secrets (any 32+ char strings suffice for dev)

### Key commands

See `package.json` scripts and `README.md` for full reference. Key ones:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Generate Prisma client | `npm run prisma:generate` |
| Apply migrations | `npm run migrate:deploy` |
| Dev server (watch mode) | `npm run start:dev` |
| Lint | `npm run lint` |
| Unit tests | `npm run test` |
| Build | `npm run build` |
| Full QA gate | `npm run qa:gate` |

### Caveats

- The auth registration endpoint is `POST /api/v1/auth/register` (not `/signup` as some docs suggest).
- Swagger UI is at `http://localhost:3001/api/docs`.
- Health check: `GET /healthz`, readiness: `GET /readyz`.
- Stripe/Clerk/Firebase/Sentry are optional in dev mode; the app starts without them.
- The lint command uses `cross-env ESLINT_USE_FLAT_CONFIG=false` to force legacy eslint config (`.eslintrc.js`). Do not switch to flat config.
- Jest tests may emit a "worker process has failed to exit gracefully" warning; this is a known minor leak and does not affect results.
- The `prisma` config in `package.json` triggers a deprecation warning about migrating to `prisma.config.ts`; this is cosmetic and can be ignored for now.

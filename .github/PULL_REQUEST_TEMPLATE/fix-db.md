## Problem
`GET /earnings/summary` returned HTTP 500 in production.

Root cause: the `paid` value was added to `LocalMissionStatus` in `prisma/schema.prisma` but no Postgres migration was ever created to ALTER the enum. The PostgreSQL enum only had: `open, assigned, in_progress, completed, cancelled`.

Any query filtering `status IN ['completed', 'paid']` threw `PostgresError 22P02: invalid input value for enum "LocalMissionStatus": "paid"`.

## Fix
Single idempotent SQL migration:
```sql
ALTER TYPE "LocalMissionStatus" ADD VALUE IF NOT EXISTS 'paid';
```

## Proof (applied to Railway prod before this PR)
- Enum before: `open, assigned, in_progress, completed, cancelled`
- Enum after: `open, assigned, in_progress, completed, cancelled, paid`
- `GET /earnings/summary` was HTTP 500, now HTTP 200
- Smoke tests: 28/28 PASS

## Safety
- `IF NOT EXISTS` is idempotent, safe to run multiple times
- Non-destructive: adds a value, never modifies/deletes existing data
- No existing rows affected (no row could ever have `status=paid` before this migration)

## Rollback
Adding enum values in PostgreSQL cannot be undone (no DROP VALUE). Compensatory measure if needed: add a guard in EarningsService to catch the enum value gracefully.

## Checklist
- Migration file created
- `prisma validate` passes
- `npm run build` passes (0 errors)
- 1100/1100 unit tests pass
- Migration applied and verified on Railway prod
- Smoke tests 28/28 PASS

-- Code de parrainage unique par LocalUser (nullable pour rétrocompatibilité ; backfill lazy côté API)

ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "local_users_referralCode_key" ON "local_users"("referralCode");

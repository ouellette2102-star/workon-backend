-- PR-07: Legal Compliance Baseline
-- Safe migration: All changes are additive (CREATE TABLE, CREATE TYPE, ADD COLUMN)
-- No data loss risk

-- CreateEnum: ConsentType
CREATE TYPE "ConsentType" AS ENUM ('MARKETING_EMAIL', 'MARKETING_PUSH', 'ANALYTICS', 'THIRD_PARTY_SHARING', 'PERSONALIZATION');

-- CreateTable: terms_versions (Terms & Conditions versioning)
CREATE TABLE IF NOT EXISTS "terms_versions" (
    "id" TEXT NOT NULL,
    "type" "ComplianceDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "contentHash" TEXT,
    "summary" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "terms_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_consents (User consent tracking)
CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: terms_versions unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "terms_versions_type_version_key" ON "terms_versions"("type", "version");

-- CreateIndex: terms_versions indexes
CREATE INDEX IF NOT EXISTS "terms_versions_type_isActive_idx" ON "terms_versions"("type", "isActive");
CREATE INDEX IF NOT EXISTS "terms_versions_effectiveAt_idx" ON "terms_versions"("effectiveAt");

-- CreateIndex: user_consents unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "user_consents_userId_consentType_key" ON "user_consents"("userId", "consentType");

-- CreateIndex: user_consents indexes
CREATE INDEX IF NOT EXISTS "user_consents_userId_idx" ON "user_consents"("userId");
CREATE INDEX IF NOT EXISTS "user_consents_consentType_idx" ON "user_consents"("consentType");

-- AddForeignKey: user_consents -> users
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add legal compliance columns to local_users
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "privacyVersion" TEXT;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "dataRetentionConsent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "dataExportRequestedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "dataExportCompletedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "local_users" ADD COLUMN IF NOT EXISTS "deletionScheduledFor" TIMESTAMP(3);

-- CreateIndex: local_users deletion schedule index
CREATE INDEX IF NOT EXISTS "local_users_deletionScheduledFor_idx" ON "local_users"("deletionScheduledFor");


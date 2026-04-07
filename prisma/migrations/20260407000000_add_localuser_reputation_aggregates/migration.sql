-- Reputation aggregates materialized on LocalUser and kept in sync by ReputationService.
ALTER TABLE "local_users"
  ADD COLUMN "ratingAverage"          DOUBLE PRECISION,
  ADD COLUMN "reviewCount"            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedMissionsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trustScore"             DOUBLE PRECISION,
  ADD COLUMN "trustScoreUpdatedAt"    TIMESTAMP(3);

CREATE INDEX "local_users_trustScore_idx" ON "local_users"("trustScore");

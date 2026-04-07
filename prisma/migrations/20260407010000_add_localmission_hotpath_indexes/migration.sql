-- Sprint 3 — hot-path composite indexes on local_missions.
-- findByBbox / findNearby ORDER BY createdAt DESC where status='open'.
CREATE INDEX IF NOT EXISTS "local_missions_status_createdAt_idx"
  ON "local_missions" ("status", "createdAt");

-- findByWorker ORDER BY updatedAt DESC scoped by assignedToUserId.
CREATE INDEX IF NOT EXISTS "local_missions_assignedToUserId_updatedAt_idx"
  ON "local_missions" ("assignedToUserId", "updatedAt");

-- findNearby price range filter.
CREATE INDEX IF NOT EXISTS "local_missions_price_idx"
  ON "local_missions" ("price");

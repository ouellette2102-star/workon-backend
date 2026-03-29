-- Full-text search indexes using PostgreSQL tsvector
-- Enables fast text search on missions and local_missions

-- Mission search index (title + description, French config)
CREATE INDEX IF NOT EXISTS idx_missions_search
  ON missions
  USING GIN (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));

-- LocalMission search index (title + description, French config)
CREATE INDEX IF NOT EXISTS idx_local_missions_search
  ON local_missions
  USING GIN (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));

-- WorkerProfile denormalized rating fields
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;

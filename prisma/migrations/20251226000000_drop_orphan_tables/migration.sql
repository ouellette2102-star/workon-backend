-- Migration: drop_orphan_tables
-- Description: Remove unused tables from MVP scope (Post, PostLike, Match, ScheduleSlot)
-- These models were removed from schema.prisma in PR1 but tables still exist in DB
-- 
-- IMPORTANT: Verify tables are empty before running this migration
-- Run this query first:
--   SELECT 'matches' as t, COUNT(*) FROM matches
--   UNION ALL SELECT 'posts', COUNT(*) FROM posts
--   UNION ALL SELECT 'post_likes', COUNT(*) FROM post_likes
--   UNION ALL SELECT 'schedule_slots', COUNT(*) FROM schedule_slots;
--
-- Rollback: Restore from DB backup (tables will be recreated)

-- Drop tables in correct order (children first due to FK constraints)
-- Note: CASCADE will automatically drop dependent indexes and FK constraints

-- 1. Drop post_likes (depends on posts and users)
DROP TABLE IF EXISTS "post_likes" CASCADE;

-- 2. Drop posts (depends on worker_profiles)
DROP TABLE IF EXISTS "posts" CASCADE;

-- 3. Drop matches (depends on missions and worker_profiles)
DROP TABLE IF EXISTS "matches" CASCADE;

-- 4. Drop schedule_slots (depends on worker_profiles)
DROP TABLE IF EXISTS "schedule_slots" CASCADE;


-- Migration: add_paid_to_local_mission_status
-- 
-- Root cause: 'paid' was added to LocalMissionStatus in prisma/schema.prisma
-- but no migration was ever created to ALTER the PostgreSQL enum.
-- This caused PostgresError 22P02 on any query using status='paid'.
--
-- Safe: ADD VALUE IF NOT EXISTS is idempotent and non-destructive.
-- No existing data is affected (no rows can have status='paid' since it didn't exist).

ALTER TYPE "LocalMissionStatus" ADD VALUE IF NOT EXISTS 'paid';

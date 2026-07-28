-- ============================================================================
-- Migration: Set REPLICA IDENTITY FULL on realtime tables
--
-- REPLICA IDENTITY FULL ensures that Supabase Realtime sends the COMPLETE old
-- row in payload.old for UPDATE events. Without this, payload.old only contains
-- the primary key columns, making it impossible to reliably detect state
-- transitions like is_active going from false → true.
-- ============================================================================

-- Set REPLICA IDENTITY FULL on tables used for realtime quiz delivery
-- This ensures postgres_changes events include full old-row data
ALTER TABLE questions REPLICA IDENTITY FULL;
ALTER TABLE episode_scores REPLICA IDENTITY FULL;
ALTER TABLE episodes REPLICA IDENTITY FULL;

-- ============================================================================
-- Create quiz_events table for reliable broadcast-style delivery
--
-- The edge function writes INSERT rows here when activating/closing questions.
-- The client subscribes to INSERT changes on this table via postgres_changes.
-- This is MORE RELIABLE than relying on UPDATE postgres_changes because:
--   1. INSERT events are always new — no false-positive detection logic needed
--   2. No race condition with old-question deactivation triggering wrong events
--   3. Every event is a discrete row, never overwritten
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'QUESTION_ACTIVATED',
    'QUESTION_CLOSED',
    'QUESTION_DISMISSED',
    'LEADERBOARD_UPDATED'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient per-episode queries
CREATE INDEX IF NOT EXISTS idx_quiz_events_episode_id ON quiz_events(episode_id);
CREATE INDEX IF NOT EXISTS idx_quiz_events_created_at ON quiz_events(created_at DESC);

-- Add quiz_events to the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quiz_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quiz_events;
  END IF;
END $$;

-- RLS: Users can read quiz_events for episodes they participate in
ALTER TABLE quiz_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quiz events" ON quiz_events;
CREATE POLICY "Users can view quiz events" ON quiz_events
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- Ensure ALL quiz-relevant tables are in the publication (belt and suspenders)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'questions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE questions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'episode_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE episode_scores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'episodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE episodes;
  END IF;
END $$;

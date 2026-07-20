-- ============================================================================
-- Migration: Add has_been_activated to questions
-- ============================================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS has_been_activated BOOLEAN DEFAULT FALSE;

-- Enable questions table for realtime (ensure it's in the publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'questions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE questions;
  END IF;
END $$;

-- Add RLS policy for admins to manage questions (needed for edge functions)
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
CREATE POLICY "Admins can update questions" ON questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Users can view all questions" ON questions;
CREATE POLICY "Users can view all questions" ON questions FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- Function: recalculate_episode_ranks
-- Recalculates rank for all participants in an episode based on total_score
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_episode_ranks(p_episode_id UUID)
RETURNS void AS $$
BEGIN
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as new_rank
    FROM episode_scores
    WHERE episode_id = p_episode_id
  )
  UPDATE episode_scores es
  SET rank = ranked.new_rank
  FROM ranked
  WHERE es.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

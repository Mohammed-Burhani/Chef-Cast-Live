-- ============================================================================
-- Migration: Add dismissed_at column to questions
-- Tracks when a question was dismissed from the live view after being answered
-- This is the final state transition: activated → closed → dismissed
-- ============================================================================

-- Add the dismissed_at column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- Add a composite index for efficient queries during live quiz
CREATE INDEX IF NOT EXISTS idx_questions_dismissed_at ON questions(dismissed_at)
  WHERE dismissed_at IS NOT NULL;

-- ============================================================================
-- Function: auto_live_episodes
-- Transitions scheduled episodes to live when their scheduled_at time arrives
-- Can be called periodically by the admin dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_live_episodes()
RETURNS SETOF episodes AS $$
BEGIN
  RETURN QUERY
  UPDATE episodes SET
    is_live = true,
    status = 'live',
    ended_at = null
  WHERE
    status = 'scheduled'
    AND is_live = false
    AND ended_at IS NULL
    AND scheduled_at <= NOW()
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

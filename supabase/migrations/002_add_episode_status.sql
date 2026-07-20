-- ============================================================================
-- Migration: Add status column to episodes
-- Replaces is_live boolean with a status enum for clearer state management
-- States: scheduled → live → ended
-- ============================================================================

-- Add the status column
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('scheduled', 'live', 'ended'))
  DEFAULT 'scheduled';

-- Backfill existing data based on current is_live / ended_at values
UPDATE episodes SET status = 'live' WHERE is_live = true AND ended_at IS NULL;
UPDATE episodes SET status = 'ended' WHERE ended_at IS NOT NULL;
UPDATE episodes SET status = 'scheduled' WHERE is_live = false AND ended_at IS NULL;

-- Make status NOT NULL after backfill
ALTER TABLE episodes ALTER COLUMN status SET NOT NULL;

-- Enable episodes table for realtime (ensure it's in the publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'episodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE episodes;
  END IF;
END $$;

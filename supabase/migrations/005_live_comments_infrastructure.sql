-- ============================================================================
-- Migration: Live Comments Infrastructure
--
-- Adds rate limiting, proper RLS, and Realtime publication for the comments
-- system. Designed to handle 10,000+ concurrent commenters:
--   - Rate limiting table prevents spam
--   - Broadcast-based delivery (no DB trigger per comment)
--   - Composite indexes for fast history queries
-- ============================================================================

-- ============================================================================
-- 1. RATE LIMITING TABLE
-- Stores per-user, per-episode rate limit tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  comment_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, episode_id)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_comment_rate_limits_cleanup
  ON comment_rate_limits(window_start);

-- ============================================================================
-- 2. COMMENTS TABLE IMPROVEMENTS
-- Add composite indexes for efficient per-episode history queries
-- ============================================================================

-- Composite index for loading comments by episode (most common query)
CREATE INDEX IF NOT EXISTS idx_comments_episode_created
  ON comments(episode_id, created_at DESC);

-- Index for rate limit checks
CREATE INDEX IF NOT EXISTS idx_comments_user_episode_recent
  ON comments(user_id, episode_id, created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES FOR COMMENTS
-- Users can read all comments for episodes they participate in
-- Users can only insert their own comments
-- ============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow reading comments (anyone authenticated can read)
DROP POLICY IF EXISTS "Users can view episode comments" ON comments;
CREATE POLICY "Users can view episode comments" ON comments
  FOR SELECT TO authenticated
  USING (true);

-- Allow inserting own comments
DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
CREATE POLICY "Users can insert own comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. RATE LIMITS RLS
-- ============================================================================

ALTER TABLE comment_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own rate limits
DROP POLICY IF EXISTS "Users can view own rate limits" ON comment_rate_limits;
CREATE POLICY "Users can view own rate limits" ON comment_rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all rate limits (edge function uses service role)
DROP POLICY IF EXISTS "Service role manages rate limits" ON comment_rate_limits;
CREATE POLICY "Service role manages rate limits" ON comment_rate_limits
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- 5. REALTIME PUBLICATION
-- Add comments table to supabase_realtime publication
-- NOTE: We use Broadcast for real-time delivery, but having the table in the
-- publication enables postgres_changes as a fallback for history sync.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;
END $$;

-- ============================================================================
-- 6. CLEANUP FUNCTION
-- Removes old rate limit records (older than 1 hour)
-- Can be called by a pg_cron job or edge function
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM comment_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON comments TO authenticated;
GRANT SELECT ON comment_rate_limits TO authenticated;
GRANT ALL ON comment_rate_limits TO service_role;

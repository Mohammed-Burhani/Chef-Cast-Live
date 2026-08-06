-- ============================================================================
-- Migration: Community Post Comments
--
-- Real comments for community posts (dish_photos). The prototype's community
-- comment sheet (CommentsSheet) was mock-only; this adds the persistence +
-- realtime layer so comments stream to open sheets via postgres_changes.
--
--   - post_comments       : comment rows attached to a dish_photo
--   - post_comment_likes  : like/unlike per comment
--   - RLS                 : read-all for authenticated, write own rows
--   - Realtime            : INSERT events on post_comments published
--   - RPC get_post_comments          : one-call history with likes/liked state
--   - RPC toggle_post_comment_like   : atomic like toggle, returns new count
-- ============================================================================

-- ============================================================================
-- 1. POST COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES dish_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Composite index for per-post history queries (most common query)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON post_comments(post_id, created_at DESC);

-- ============================================================================
-- 2. POST COMMENT LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Index for like counts + toggle lookups
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment
  ON post_comment_likes(comment_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comment_likes ENABLE ROW LEVEL SECURITY;

-- post_comments: anyone authenticated can read; users manage their own rows
DROP POLICY IF EXISTS "Users can view all post comments" ON post_comments;
CREATE POLICY "Users can view all post comments" ON post_comments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own post comments" ON post_comments;
CREATE POLICY "Users can insert own post comments" ON post_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post comments" ON post_comments;
CREATE POLICY "Users can delete own post comments" ON post_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- post_comment_likes: anyone authenticated can read; users manage their own rows
DROP POLICY IF EXISTS "Users can view all post comment likes" ON post_comment_likes;
CREATE POLICY "Users can view all post comment likes" ON post_comment_likes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own post comment likes" ON post_comment_likes;
CREATE POLICY "Users can insert own post comment likes" ON post_comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post comment likes" ON post_comment_likes;
CREATE POLICY "Users can delete own post comment likes" ON post_comment_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. REALTIME PUBLICATION
-- Open comment sheets subscribe to INSERT events filtered by post_id.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  END IF;
END $$;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- SECURITY INVOKER so RLS applies as the calling user.
-- ============================================================================

-- Load comments for a post with username/avatar, like count, and liked state.
-- Single call avoids N+1 history queries.
CREATE OR REPLACE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  user_id UUID,
  text TEXT,
  created_at TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT,
  like_count BIGINT,
  is_liked BOOLEAN
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    c.text,
    c.created_at,
    p.username,
    p.avatar_url,
    (SELECT count(*) FROM post_comment_likes l WHERE l.comment_id = c.id) AS like_count,
    EXISTS (
      SELECT 1 FROM post_comment_likes l2
      WHERE l2.comment_id = c.id AND l2.user_id = auth.uid()
    ) AS is_liked
  FROM post_comments c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at DESC;
$$;

-- Atomically toggle the current user's like on a comment; returns the new count.
CREATE OR REPLACE FUNCTION toggle_post_comment_like(p_comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_new_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM post_comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_user
  ) THEN
    DELETE FROM post_comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_user;
  ELSE
    INSERT INTO post_comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user);
  END IF;

  SELECT count(*) INTO v_new_count
  FROM post_comment_likes
  WHERE comment_id = p_comment_id;

  RETURN v_new_count;
END $$;

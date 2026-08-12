-- ============================================================================
-- Migration: Community Mode (posts, bookmarks, stories, curated feed)
--
-- Converts the community prototype into a full Instagram-like Community Mode:
--
--   - dish_photos     : gains `tags` (cuisine/content signal for the feed
--                       algorithm) and `location`
--   - post_saves      : user bookmarks on posts
--   - stories         : user stories (auto-expire via expires_at)
--   - story_views     : who viewed which story (viewed state + viewer counts)
--   - get_community_feed : per-user curated feed algorithm
--   - get_user_activity  : unified feed of a user's posts/comments/likes/saves
--
--   - RLS            : every new table is RLS-protected; users can only
--                      insert/delete their own rows, everyone reads.
--   - Storage        : new `stories` bucket (public read, auth upload).
--   - Realtime       : `stories` published so the bar refreshes live.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. DISH_PHOTOS: TAGS + LOCATION
-- ---------------------------------------------------------------------------
ALTER TABLE dish_photos
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE INDEX IF NOT EXISTS idx_dish_photos_tags ON dish_photos USING GIN (tags);

-- ---------------------------------------------------------------------------
-- 2. POST_SAVES (bookmarks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES dish_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_saves_photo ON post_saves(photo_id);

ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all post saves" ON post_saves;
CREATE POLICY "Users can view all post saves" ON post_saves
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own post saves" ON post_saves;
CREATE POLICY "Users can insert own post saves" ON post_saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post saves" ON post_saves;
CREATE POLICY "Users can delete own post saves" ON post_saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. STORIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all stories" ON stories;
CREATE POLICY "Users can view all stories" ON stories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
CREATE POLICY "Users can insert own stories" ON stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. STORY_VIEWS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user ON story_views(user_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own story views" ON story_views;
CREATE POLICY "Users can view own story views" ON story_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own story views" ON story_views;
CREATE POLICY "Users can insert own story views" ON story_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. STORAGE BUCKET: stories
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read stories" ON storage.objects;
CREATE POLICY "Public read stories"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated upload stories" ON storage.objects;
CREATE POLICY "Authenticated upload stories"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stories');

DROP POLICY IF EXISTS "Users update own stories" ON storage.objects;
CREATE POLICY "Users update own stories"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own stories" ON storage.objects;
CREATE POLICY "Users delete own stories"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- 6. FEED ALGORITHM: get_community_feed
--
-- Per-user curated feed. Each post gets a score:
--
--   score = engagement + freshness + affinity + daily_variation
--
--   - engagement  : ln(1 + likes) + ln(1 + comments)  (volume)
--   - freshness   : exponential decay by age in days
--   - affinity    : content + social signals unique to this user
--       + tag overlap with the user's onboarding cuisine preferences
--       + tag overlap with posts the user liked/saved/commented on
--       + author affinity (authors the user engaged with)
--       + episode affinity (posts tagged to episodes the user played)
--   - daily_variation : deterministic hash of (user, UTC date, post) mapped to
--       [-0.5, +0.5] so the feed reorders every day but stays stable within a
--       day — which keeps OFFSET pagination (infinite scroll) correct.
--
-- The user's own posts are excluded. Already-seen ids may be passed in to
-- avoid mid-session duplicates when a like shifts scores.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_days_back INTEGER DEFAULT 60,
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  image_url TEXT,
  caption TEXT,
  location TEXT,
  tags TEXT[],
  like_count INTEGER,
  comment_count BIGINT,
  is_liked BOOLEAN,
  is_saved BOOLEAN,
  created_at TIMESTAMPTZ,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
BEGIN
  RETURN QUERY
  WITH me AS (
    SELECT id, COALESCE(cuisines, '{}') AS cuisines FROM profiles WHERE id = p_user_id
  ),
  engaged_posts AS (
    SELECT photo_id FROM dish_photo_likes WHERE user_id = p_user_id
    UNION
    SELECT post_id FROM post_saves WHERE user_id = p_user_id
    UNION
    SELECT post_id FROM post_comments WHERE user_id = p_user_id
  ),
  liked_tags AS (
    SELECT DISTINCT tag
    FROM dish_photos dp, unnest(dp.tags) AS tag
    WHERE dp.id IN (SELECT photo_id FROM engaged_posts)
  ),
  engaged_authors AS (
    SELECT user_id FROM dish_photos
    WHERE id IN (SELECT photo_id FROM engaged_posts)
    UNION
    SELECT user_id FROM post_comments WHERE user_id = p_user_id
  ),
  played_episodes AS (
    SELECT episode_id FROM episode_scores WHERE user_id = p_user_id
  ),
  comment_counts AS (
    SELECT post_id, COUNT(*) AS c FROM post_comments GROUP BY post_id
  ),
  scored AS (
    SELECT
      dp.id,
      dp.user_id,
      dp.image_url,
      dp.caption,
      dp.location,
      dp.tags,
      dp.like_count,
      COALESCE(cc.c, 0) AS comment_count,
      dp.created_at,
      -- engagement: log-scaled volume, decayed by age (half-life ~10 days)
      (ln(1 + dp.like_count::numeric) + ln(1 + COALESCE(cc.c, 0)::numeric))
        * exp(-0.07 * GREATEST(0, EXTRACT(EPOCH FROM (NOW() - dp.created_at)) / 86400.0)) AS engagement,
      -- affinity: content (cuisines + liked tags), social (authors), episodes
      (
        COALESCE((SELECT COUNT(*) FROM unnest(dp.tags) t WHERE t = ANY (me.cuisines)), 0) * 1.0
        + COALESCE((SELECT COUNT(*) FROM unnest(dp.tags) t WHERE t IN (SELECT tag FROM liked_tags)), 0) * 1.0
        + CASE WHEN dp.user_id IN (SELECT user_id FROM engaged_authors) THEN 1.2 ELSE 0 END
        + CASE WHEN dp.episode_id IN (SELECT episode_id FROM played_episodes) THEN 0.8 ELSE 0 END
      ) AS affinity,
      -- daily variation in [-0.5, +0.5], deterministic within a day
      (ABS(hashtext(p_user_id::text || '|' || v_day || '|' || dp.id::text)) % 1000) / 1000.0 - 0.5 AS daily_var
    FROM dish_photos dp
    LEFT JOIN comment_counts cc ON cc.post_id = dp.id
    CROSS JOIN me
    WHERE dp.user_id <> p_user_id
      AND dp.created_at >= NOW() - (p_days_back || ' days')::interval
      AND NOT (p_exclude_ids IS NOT NULL AND dp.id = ANY (p_exclude_ids))
  )
  SELECT
    s.id,
    s.user_id,
    p.username,
    p.avatar_url,
    s.image_url,
    s.caption,
    s.location,
    s.tags,
    s.like_count,
    s.comment_count,
    EXISTS (SELECT 1 FROM dish_photo_likes l WHERE l.photo_id = s.id AND l.user_id = p_user_id) AS is_liked,
    EXISTS (SELECT 1 FROM post_saves sv WHERE sv.photo_id = s.id AND sv.user_id = p_user_id) AS is_saved,
    s.created_at,
    (s.engagement * 1.0 + s.affinity * 1.6 + s.daily_var) AS score
  FROM scored s
  JOIN profiles p ON p.id = s.user_id
  ORDER BY score DESC, s.created_at DESC, s.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_feed(UUID, INTEGER, INTEGER, INTEGER, UUID[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. ACTIVITIES: get_user_activity
--
-- Unified, reverse-chronological feed of a user's own community actions:
-- posts they created, comments they wrote, likes and saves they gave.
-- Only includes actions tied to posts that still exist.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  activity_type TEXT,
  post_id UUID,
  image_url TEXT,
  caption TEXT,
  text TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'post:' || dp.id,
    'post',
    dp.id,
    dp.image_url,
    dp.caption,
    dp.caption,
    dp.created_at
  FROM dish_photos dp
  WHERE dp.user_id = p_user_id

  UNION ALL

  SELECT
    'comment:' || pc.id,
    'comment',
    pc.post_id,
    dp.image_url,
    dp.caption,
    pc.text,
    pc.created_at
  FROM post_comments pc
  JOIN dish_photos dp ON dp.id = pc.post_id
  WHERE pc.user_id = p_user_id

  UNION ALL

  SELECT
    'like:' || l.id,
    'like',
    l.photo_id,
    dp.image_url,
    dp.caption,
    NULL,
    l.created_at
  FROM dish_photo_likes l
  JOIN dish_photos dp ON dp.id = l.photo_id
  WHERE l.user_id = p_user_id

  UNION ALL

  SELECT
    'save:' || ps.id,
    'save',
    ps.photo_id,
    dp.image_url,
    dp.caption,
    NULL,
    ps.created_at
  FROM post_saves ps
  JOIN dish_photos dp ON dp.id = ps.photo_id
  WHERE ps.user_id = p_user_id

  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_activity(UUID, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. REALTIME PUBLICATION
-- Stories refresh live in the bar; posts/comments stay on-demand per the
-- "no realtime" requirement for comments.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
END $$;

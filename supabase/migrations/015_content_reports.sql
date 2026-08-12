-- ============================================================================
-- Migration: Community Moderation (reports, hide, ban, admin analytics)
--
-- Builds moderation + admin insight on top of Community Mode (014):
--
--   - dish_photos.is_hidden    : admin hides a post from all feeds
--   - post_comments.is_hidden  : admin hides a comment from comment sheets
--   - profiles.is_banned       : admin suspends a user (content hidden from
--                                others, banned users can no longer create
--                                posts/comments/stories)
--   - content_reports          : user reports on posts/comments
--   - RPCs for the admin dashboard:
--       get_community_admin_stats  → DB-wide KPIs
--       get_top_posts              → posts ranked by engagement
--       get_top_comments           → comments ranked by likes
--       get_top_posters            → per-user posting stats
--       get_content_reports        → reports joined with target context
--
--   - Feed RPCs updated so hidden posts and banned authors disappear.
--   - Report rows are purged via triggers when their target is deleted.
--
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. MODERATION COLUMNS
-- ---------------------------------------------------------------------------
ALTER TABLE dish_photos
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dish_photos_hidden ON dish_photos(is_hidden)
  WHERE is_hidden = true;
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(is_banned)
  WHERE is_banned = true;

-- ---------------------------------------------------------------------------
-- 2. CONTENT_REPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  -- Polymorphic target: no FK so a deleted target is cleaned up by triggers below.
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 200),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON content_reports(target_type, target_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports; admins see everything.
DROP POLICY IF EXISTS "Users can view reports" ON content_reports;
CREATE POLICY "Users can view reports" ON content_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Banned users cannot file reports.
DROP POLICY IF EXISTS "Users can insert own reports" ON content_reports;
CREATE POLICY "Users can insert own reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;
CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete reports" ON content_reports;
CREATE POLICY "Admins can delete reports" ON content_reports
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ---------------------------------------------------------------------------
-- 3. ADMIN MODERATION POLICIES ON EXISTING TABLES
--
-- Users keep their own-row insert/delete policies; these add admin powers.
-- ---------------------------------------------------------------------------

-- dish_photos: admins may hide (update) or delete any post.
DROP POLICY IF EXISTS "Admins can update any dish photos" ON dish_photos;
CREATE POLICY "Admins can update any dish photos" ON dish_photos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete any dish photos" ON dish_photos;
CREATE POLICY "Admins can delete any dish photos" ON dish_photos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- post_comments: admins may hide (update) or delete any comment.
DROP POLICY IF EXISTS "Admins can update any post comments" ON post_comments;
CREATE POLICY "Admins can update any post comments" ON post_comments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete any post comments" ON post_comments;
CREATE POLICY "Admins can delete any post comments" ON post_comments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- profiles: admins may update any profile (ban). A trigger below stops
-- non-admins from flipping is_banned on their own row through the
-- "Users can update own profile" policy.
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ---------------------------------------------------------------------------
-- 4. BANNED USERS CANNOT CREATE CONTENT
-- Rewrites the insert policies so banned users are rejected server-side.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own dish photos" ON dish_photos;
CREATE POLICY "Users can insert own dish photos" ON dish_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

DROP POLICY IF EXISTS "Users can insert own post comments" ON post_comments;
CREATE POLICY "Users can insert own post comments" ON post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
CREATE POLICY "Users can insert own stories" ON stories
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

-- ---------------------------------------------------------------------------
-- 5. GUARDS
-- ---------------------------------------------------------------------------

-- Only admins can change ban status (otherwise a user could unban themselves
-- through the "update own profile" policy).
CREATE OR REPLACE FUNCTION public.enforce_admin_only_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can change ban status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_only_ban ON profiles;
CREATE TRIGGER enforce_admin_only_ban
  BEFORE UPDATE OF is_banned ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_ban();

-- Purge reports when their target is deleted (no FK on the polymorphic id).
CREATE OR REPLACE FUNCTION public.delete_reports_for_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM content_reports
  WHERE target_type = TG_ARGV[0] AND target_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_reports_post ON dish_photos;
CREATE TRIGGER trg_delete_reports_post
  AFTER DELETE ON dish_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reports_for_target('post');

DROP TRIGGER IF EXISTS trg_delete_reports_comment ON post_comments;
CREATE TRIGGER trg_delete_reports_comment
  AFTER DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reports_for_target('comment');

-- ---------------------------------------------------------------------------
-- 6. FEED VISIBILITY: hidden posts + banned authors disappear
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
      (ln(1 + dp.like_count::numeric) + ln(1 + COALESCE(cc.c, 0)::numeric))
        * exp(-0.07 * GREATEST(0, EXTRACT(EPOCH FROM (NOW() - dp.created_at)) / 86400.0)) AS engagement,
      (
        COALESCE((SELECT COUNT(*) FROM unnest(dp.tags) t WHERE t = ANY (me.cuisines)), 0) * 1.0
        + COALESCE((SELECT COUNT(*) FROM unnest(dp.tags) t WHERE t IN (SELECT tag FROM liked_tags)), 0) * 1.0
        + CASE WHEN dp.user_id IN (SELECT user_id FROM engaged_authors) THEN 1.2 ELSE 0 END
        + CASE WHEN dp.episode_id IN (SELECT episode_id FROM played_episodes) THEN 0.8 ELSE 0 END
      ) AS affinity,
      (ABS(hashtext(p_user_id::text || '|' || v_day || '|' || dp.id::text)) % 1000) / 1000.0 - 0.5 AS daily_var
    FROM dish_photos dp
    LEFT JOIN comment_counts cc ON cc.post_id = dp.id
    CROSS JOIN me
    WHERE dp.user_id <> p_user_id
      AND NOT dp.is_hidden
      AND NOT EXISTS (SELECT 1 FROM profiles pb WHERE pb.id = dp.user_id AND pb.is_banned)
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

-- get_user_activity: a hidden post's image must not surface as context for a
-- user's own comment/like/save. (Authors still see their own uploads.)
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
  WHERE pc.user_id = p_user_id AND NOT dp.is_hidden

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
  WHERE l.user_id = p_user_id AND NOT dp.is_hidden

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
  WHERE ps.user_id = p_user_id AND NOT dp.is_hidden

  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_activity(UUID, INTEGER) TO authenticated;

-- Hidden comments disappear from comment sheets.
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id UUID)
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
  WHERE c.post_id = p_post_id AND c.is_hidden = false
  ORDER BY c.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 7. ADMIN ANALYTICS RPCs (admin-only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_community_admin_stats()
RETURNS TABLE (
  total_posts BIGINT,
  total_comments BIGINT,
  total_likes BIGINT,
  total_saves BIGINT,
  total_stories BIGINT,
  total_posters BIGINT,
  pending_reports BIGINT,
  hidden_posts BIGINT,
  hidden_comments BIGINT,
  banned_users BIGINT,
  posts_this_week BIGINT,
  comments_this_week BIGINT,
  likes_this_week BIGINT,
  saves_this_week BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM dish_photos)::bigint,
    (SELECT count(*) FROM post_comments)::bigint,
    (SELECT count(*) FROM dish_photo_likes)::bigint,
    (SELECT count(*) FROM post_saves)::bigint,
    (SELECT count(*) FROM stories)::bigint,
    (SELECT count(DISTINCT user_id) FROM dish_photos)::bigint,
    (SELECT count(*) FROM content_reports WHERE status = 'pending')::bigint,
    (SELECT count(*) FROM dish_photos WHERE is_hidden)::bigint,
    (SELECT count(*) FROM post_comments WHERE is_hidden)::bigint,
    (SELECT count(*) FROM profiles WHERE is_banned)::bigint,
    (SELECT count(*) FROM dish_photos WHERE created_at >= NOW() - interval '7 days')::bigint,
    (SELECT count(*) FROM post_comments WHERE created_at >= NOW() - interval '7 days')::bigint,
    (SELECT count(*) FROM dish_photo_likes WHERE created_at >= NOW() - interval '7 days')::bigint,
    (SELECT count(*) FROM post_saves WHERE created_at >= NOW() - interval '7 days')::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_top_posts(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  image_url TEXT,
  caption TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  save_count BIGINT,
  engagement BIGINT,
  is_hidden BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    dp.id,
    dp.user_id,
    p.username,
    p.avatar_url,
    dp.image_url,
    dp.caption,
    dp.like_count::bigint,
    (SELECT count(*) FROM post_comments c WHERE c.post_id = dp.id)::bigint,
    (SELECT count(*) FROM post_saves s WHERE s.photo_id = dp.id)::bigint,
    (dp.like_count + (SELECT count(*) FROM post_comments c WHERE c.post_id = dp.id))::bigint,
    dp.is_hidden,
    dp.created_at
  FROM dish_photos dp
  JOIN profiles p ON p.id = dp.user_id
  ORDER BY engagement DESC, dp.created_at DESC, dp.id
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_posts(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_top_comments(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  text TEXT,
  post_caption TEXT,
  like_count BIGINT,
  is_hidden BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    p.username,
    p.avatar_url,
    c.text,
    dp.caption,
    (SELECT count(*) FROM post_comment_likes l WHERE l.comment_id = c.id)::bigint,
    c.is_hidden,
    c.created_at
  FROM post_comments c
  JOIN profiles p ON p.id = c.user_id
  LEFT JOIN dish_photos dp ON dp.id = c.post_id
  ORDER BY like_count DESC, c.created_at DESC, c.id
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_comments(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_top_posters(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  post_count BIGINT,
  likes_received BIGINT,
  comments_received BIGINT,
  saves_received BIGINT,
  engagement BIGINT,
  is_banned BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(pc.post_count, 0)::bigint,
    COALESCE(pc.likes_received, 0)::bigint,
    COALESCE(pc.comments_received, 0)::bigint,
    COALESCE(pc.saves_received, 0)::bigint,
    (
      COALESCE(pc.likes_received, 0)
      + COALESCE(pc.comments_received, 0)
      + COALESCE(pc.saves_received, 0)
    )::bigint,
    p.is_banned
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT
      count(dp.id) AS post_count,
      sum(dp.like_count) AS likes_received,
      (SELECT count(*) FROM post_comments c JOIN dish_photos d ON d.id = c.post_id WHERE d.user_id = p.id) AS comments_received,
      (SELECT count(*) FROM post_saves s JOIN dish_photos d ON d.id = s.photo_id WHERE d.user_id = p.id) AS saves_received
    FROM dish_photos dp
    WHERE dp.user_id = p.id
  ) pc ON true
  WHERE COALESCE(pc.post_count, 0) > 0
  ORDER BY engagement DESC, post_count DESC, p.id
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_posters(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_content_reports()
RETURNS TABLE (
  id UUID,
  reporter_id UUID,
  reporter_username TEXT,
  reporter_avatar_url TEXT,
  target_type TEXT,
  target_id UUID,
  target_author_id UUID,
  target_author_username TEXT,
  target_content TEXT,
  target_image_url TEXT,
  reason TEXT,
  details TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.reporter_id,
    rp.username,
    rp.avatar_url,
    r.target_type,
    r.target_id,
    COALESCE(c.user_id, dp.user_id),
    COALESCE(cu.username, pu.username),
    COALESCE(c.text, dp.caption),
    COALESCE(dp.image_url, cdp.image_url),
    r.reason,
    r.details,
    r.status,
    r.created_at
  FROM content_reports r
  LEFT JOIN post_comments c ON r.target_type = 'comment' AND c.id = r.target_id
  LEFT JOIN dish_photos dp ON r.target_type = 'post' AND dp.id = r.target_id
  LEFT JOIN dish_photos cdp ON cdp.id = c.post_id
  JOIN profiles rp ON rp.id = r.reporter_id
  LEFT JOIN profiles cu ON cu.id = c.user_id
  LEFT JOIN profiles pu ON pu.id = dp.user_id
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC, r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_reports() TO authenticated;

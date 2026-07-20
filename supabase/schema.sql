-- ============================================================================
-- ChefCast Live - Complete Database Schema
-- Single consolidated schema file with storage buckets
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles: User profile data linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0 NOT NULL,
  level_title TEXT DEFAULT 'Prep Cook' NOT NULL,
  total_correct INTEGER DEFAULT 0 NOT NULL,
  episodes_participated INTEGER DEFAULT 0 NOT NULL,
  cooking_level TEXT CHECK (cooking_level IN ('beginner', 'home_cook', 'enthusiast')),
  cuisines TEXT[],
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  onboarded_at TIMESTAMPTZ,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Episodes: Live quiz episodes
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_live BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')) NOT NULL,
  ended_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  youtube_url TEXT,
  default_timer_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Questions: Quiz questions for each episode
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  timer_seconds INTEGER DEFAULT 20 NOT NULL,
  is_active BOOLEAN DEFAULT FALSE NOT NULL,
  has_been_activated BOOLEAN DEFAULT FALSE NOT NULL,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Answers: User responses to questions
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  response_time_ms INTEGER NOT NULL,
  base_points INTEGER NOT NULL,
  speed_bonus INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)
);

-- Episode Scores: Aggregate scores per user per episode
CREATE TABLE IF NOT EXISTS episode_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0 NOT NULL,
  correct_count INTEGER DEFAULT 0 NOT NULL,
  rank INTEGER,
  xp_earned INTEGER DEFAULT 0 NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, episode_id)
);

-- Badges: Achievement definitions
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Badges: Badges earned by users
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, badge_id)
);

-- Dish Photos: User-uploaded cooking photos
CREATE TABLE IF NOT EXISTS dish_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  like_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Dish Photo Likes: Likes on dish photos
CREATE TABLE IF NOT EXISTS dish_photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES dish_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, photo_id)
);

-- Follows: User follow relationships
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Push Tokens: Device push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comments: Episode comments/chat
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create dish-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dish-photos',
  'dish-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_cooking_level ON profiles(cooking_level);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_questions_episode_id ON questions(episode_id);
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_episode_id ON answers(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_scores_episode_id ON episode_scores(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_scores_rank ON episode_scores(rank);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_photos_user_id ON dish_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_photos_episode_id ON dish_photos(episode_id);
CREATE INDEX IF NOT EXISTS idx_dish_photo_likes_photo_id ON dish_photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON comments(episode_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Episodes policies
DROP POLICY IF EXISTS "Authenticated users can view episodes" ON episodes;
CREATE POLICY "Authenticated users can view episodes" ON episodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert episodes" ON episodes;
CREATE POLICY "Admins can insert episodes" ON episodes FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update episodes" ON episodes;
CREATE POLICY "Admins can update episodes" ON episodes FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete episodes" ON episodes;
CREATE POLICY "Admins can delete episodes" ON episodes FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Questions policies
DROP POLICY IF EXISTS "Users can view active or ended questions" ON questions;
CREATE POLICY "Users can view active or ended questions" ON questions FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM episodes WHERE episodes.id = questions.episode_id AND episodes.ended_at IS NOT NULL));

-- Answers policies
DROP POLICY IF EXISTS "Users can view own answers" ON answers;
CREATE POLICY "Users can view own answers" ON answers FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own answers" ON answers;
CREATE POLICY "Users can insert own answers" ON answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Episode Scores policies
DROP POLICY IF EXISTS "Users can view all episode scores" ON episode_scores;
CREATE POLICY "Users can view all episode scores" ON episode_scores FOR SELECT TO authenticated USING (true);

-- Badges policies
DROP POLICY IF EXISTS "Users can view all badges" ON badges;
CREATE POLICY "Users can view all badges" ON badges FOR SELECT TO authenticated USING (true);

-- User Badges policies
DROP POLICY IF EXISTS "Users can view all user badges" ON user_badges;
CREATE POLICY "Users can view all user badges" ON user_badges FOR SELECT TO authenticated USING (true);

-- Dish Photos policies
DROP POLICY IF EXISTS "Users can view all dish photos" ON dish_photos;
CREATE POLICY "Users can view all dish photos" ON dish_photos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own dish photos" ON dish_photos;
CREATE POLICY "Users can insert own dish photos" ON dish_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dish photos" ON dish_photos;
CREATE POLICY "Users can delete own dish photos" ON dish_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dish Photo Likes policies
DROP POLICY IF EXISTS "Users can view all likes" ON dish_photo_likes;
CREATE POLICY "Users can view all likes" ON dish_photo_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own likes" ON dish_photo_likes;
CREATE POLICY "Users can insert own likes" ON dish_photo_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own likes" ON dish_photo_likes;
CREATE POLICY "Users can delete own likes" ON dish_photo_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Follows policies
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
CREATE POLICY "Users can view all follows" ON follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own follows" ON follows;
CREATE POLICY "Users can insert own follows" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON follows;
CREATE POLICY "Users can delete own follows" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Push Tokens policies
DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
CREATE POLICY "Users can manage own push tokens" ON push_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
CREATE POLICY "Users can view all comments" ON comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
CREATE POLICY "Users can insert own comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Dish photos storage policies
DROP POLICY IF EXISTS "Public read dish photos" ON storage.objects;
CREATE POLICY "Public read dish photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dish-photos');

DROP POLICY IF EXISTS "Authenticated upload dish photos" ON storage.objects;
CREATE POLICY "Authenticated upload dish photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dish-photos');

DROP POLICY IF EXISTS "Users update own dish photos" ON storage.objects;
CREATE POLICY "Users update own dish photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own dish photos" ON storage.objects;
CREATE POLICY "Users delete own dish photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars storage policies
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_avatar_url TEXT;
  v_cooking_level TEXT;
  v_cuisines TEXT[];
  v_gender TEXT;
  v_onboarded_at TIMESTAMPTZ;
BEGIN
  -- Extract username
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1),
    'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)
  );

  -- Extract avatar URL
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Extract cooking level
  v_cooking_level := NEW.raw_user_meta_data->>'cooking_level';

  -- Extract cuisines array
  IF NEW.raw_user_meta_data->>'cuisines' IS NOT NULL THEN
    v_cuisines := ARRAY(SELECT jsonb_array_elements_text((NEW.raw_user_meta_data->>'cuisines')::jsonb));
  ELSE
    v_cuisines := NULL;
  END IF;

  -- Extract gender
  v_gender := NEW.raw_user_meta_data->>'gender';

  -- Extract onboarded timestamp
  IF NEW.raw_user_meta_data->>'onboarded_at' IS NOT NULL THEN
    v_onboarded_at := (NEW.raw_user_meta_data->>'onboarded_at')::TIMESTAMPTZ;
  ELSE
    v_onboarded_at := NULL;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    cooking_level,
    cuisines,
    gender,
    onboarded_at
  )
  VALUES (
    NEW.id,
    v_username,
    v_avatar_url,
    v_cooking_level,
    v_cuisines,
    v_gender,
    v_onboarded_at
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    cooking_level = COALESCE(EXCLUDED.cooking_level, profiles.cooking_level),
    cuisines = COALESCE(EXCLUDED.cuisines, profiles.cuisines),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    onboarded_at = COALESCE(EXCLUDED.onboarded_at, profiles.onboarded_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync episode status when is_live or ended_at changes
CREATE OR REPLACE FUNCTION public.sync_episode_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_live = true AND NEW.ended_at IS NULL THEN
    NEW.status := 'live';
  ELSIF NEW.ended_at IS NOT NULL THEN
    NEW.status := 'ended';
    NEW.is_live := false;
  ELSE
    NEW.status := 'scheduled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_episode_status_sync ON episodes;
CREATE TRIGGER on_episode_status_sync
  BEFORE INSERT OR UPDATE OF is_live, ended_at ON episodes
  FOR EACH ROW EXECUTE FUNCTION public.sync_episode_status();

-- Update episode score after answer
CREATE OR REPLACE FUNCTION public.update_episode_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO episode_scores (user_id, episode_id, total_score, correct_count)
  VALUES (NEW.user_id, NEW.episode_id, NEW.total_points, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, episode_id)
  DO UPDATE SET
    total_score = episode_scores.total_score + NEW.total_points,
    correct_count = episode_scores.correct_count + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_answer_inserted ON answers;
CREATE TRIGGER on_answer_inserted
  AFTER INSERT ON answers
  FOR EACH ROW EXECUTE FUNCTION public.update_episode_score();

-- Update dish photo like count
CREATE OR REPLACE FUNCTION public.update_photo_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dish_photos SET like_count = like_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE dish_photos SET like_count = like_count - 1 WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_photo_like_change ON dish_photo_likes;
CREATE TRIGGER on_photo_like_change
  AFTER INSERT OR DELETE ON dish_photo_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_photo_like_count();

-- Recalculate ranks for all participants in an episode
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

-- ============================================================================
-- REALTIME
-- ============================================================================

DO $$
BEGIN
  -- Only add tables if not already in publication
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dish_photos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dish_photos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;
END $$;

-- Foodilicious: Live - Initial Database Schema
-- Creates all tables, RLS policies, and seed data for the live quiz app

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles: User profile data linked to auth.users
-- Note: Anonymous users may not have profiles initially
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0 NOT NULL,
  level_title TEXT DEFAULT 'Prep Cook' NOT NULL,
  total_correct INTEGER DEFAULT 0 NOT NULL,
  episodes_participated INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Episodes: Live quiz episodes
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_live BOOLEAN DEFAULT FALSE NOT NULL,
  ended_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Questions: Quiz questions for each episode
CREATE TABLE questions (
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
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Answers: User responses to questions
CREATE TABLE answers (
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
CREATE TABLE episode_scores (
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
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Badges: Badges earned by users
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, badge_id)
);

-- Dish Photos: User-uploaded cooking photos
CREATE TABLE dish_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  like_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Dish Photo Likes: Likes on dish photos
CREATE TABLE dish_photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES dish_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, photo_id)
);

-- Follows: User follow relationships
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Push Tokens: Device push notification tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_questions_episode_id ON questions(episode_id);
CREATE INDEX idx_questions_is_active ON questions(is_active);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_episode_id ON answers(episode_id);
CREATE INDEX idx_episode_scores_episode_id ON episode_scores(episode_id);
CREATE INDEX idx_episode_scores_rank ON episode_scores(rank);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_dish_photos_user_id ON dish_photos(user_id);
CREATE INDEX idx_dish_photos_episode_id ON dish_photos(episode_id);
CREATE INDEX idx_dish_photo_likes_photo_id ON dish_photo_likes(photo_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
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

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Episodes policies
CREATE POLICY "Authenticated users can view episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (true);

-- Questions policies
-- Only show active questions or questions from ended episodes
CREATE POLICY "Users can view active or ended questions"
  ON questions FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = questions.episode_id 
      AND episodes.ended_at IS NOT NULL
    )
  );

-- Answers policies
CREATE POLICY "Users can view own answers"
  ON answers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Episode Scores policies
CREATE POLICY "Users can view all episode scores"
  ON episode_scores FOR SELECT
  TO authenticated
  USING (true);

-- Note: INSERT/UPDATE on episode_scores handled by service role via Edge Functions

-- Badges policies
CREATE POLICY "Users can view all badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- User Badges policies
CREATE POLICY "Users can view all user badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (true);

-- Note: INSERT on user_badges handled by service role via Edge Functions

-- Dish Photos policies
CREATE POLICY "Users can view all dish photos"
  ON dish_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own dish photos"
  ON dish_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dish photos"
  ON dish_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Dish Photo Likes policies
CREATE POLICY "Users can view all likes"
  ON dish_photo_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON dish_photo_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON dish_photo_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Push Tokens policies
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable Realtime for live quiz updates
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE episode_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE dish_photos;

-- ============================================================================
-- SEED DATA - BADGES
-- ============================================================================

INSERT INTO badges (key, name, description, xp_reward) VALUES
  ('first_answer', 'First Answer', 'Submit an answer in the very first live quiz.', 25),
  ('perfect_round', 'Perfect Round', 'Answer all questions correctly in a single episode.', 200),
  ('speed_king', 'Speed King', 'Claim the speed bonus on 10 or more questions.', 75),
  ('top_3', 'Top 3', 'Finish in the top 3 on any episode leaderboard.', 100),
  ('comeback_kid', 'Comeback Kid', 'Finish top 10 after being outside top 50 at halfway.', 100),
  ('mystery_winner', 'Mystery Winner', 'Have a Mystery Box submission featured on TV.', 200),
  ('community_star', 'Community Star', 'Receive 50 total likes on dish photos.', 100),
  ('loyal_viewer', 'Loyal Viewer', 'Participate in 10 live episodes.', 150),
  ('early_bird', 'Early Bird', 'Join a live quiz within 2 minutes of broadcast start.', 30),
  ('perfect_plate', 'Perfect Plate', 'Upload a dish photo AND answer all questions in an episode.', 100);

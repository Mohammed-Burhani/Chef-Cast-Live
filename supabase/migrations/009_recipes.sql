-- ============================================================================
-- Migration: Recipes (Admin CMS)
--
-- Blog-style recipe posts with a full recipe structure (ingredients + steps as
-- JSONB) so a recipe can also power the cook-along experience later.
--
--   - RLS                 : all authenticated read; only admins write
--                           (mirrors the episodes policy pattern)
--   - Realtime            : published so the homepage updates when an admin
--                           creates/updates a recipe
--   - updated_at trigger  : auto-bump on UPDATE
-- ============================================================================

-- ============================================================================
-- 1. RECIPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  author_name TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prep_time_minutes INTEGER DEFAULT 0 NOT NULL,
  cook_time_minutes INTEGER DEFAULT 0 NOT NULL,
  servings INTEGER DEFAULT 4 NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb NOT NULL,
  nutrition JSONB DEFAULT '{}'::jsonb NOT NULL,
  is_published BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast published-feed queries (homepage + list screens)
CREATE INDEX IF NOT EXISTS idx_recipes_published_created
  ON recipes(is_published, created_at DESC);

-- ============================================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_recipes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_recipes_updated_at ON public.recipes;
CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_recipes_updated_at();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view recipes" ON recipes;
CREATE POLICY "Authenticated users can view recipes" ON recipes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert recipes" ON recipes;
CREATE POLICY "Admins can insert recipes" ON recipes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update recipes" ON recipes;
CREATE POLICY "Admins can update recipes" ON recipes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete recipes" ON recipes;
CREATE POLICY "Admins can delete recipes" ON recipes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================================
-- 4. REALTIME PUBLICATION
-- Homepage subscribes to recipe changes so a newly published recipe appears live.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recipes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
  END IF;
END $$;

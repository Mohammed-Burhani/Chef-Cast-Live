-- ============================================================================
-- Migration: Announcements (Admin CMS)
--
-- Admin-published announcements shown on the homepage "What's Cooking" section
-- and a dedicated user-facing listing page.
--
--   - RLS                 : all authenticated read; only admins write
--                           (mirrors the recipes/episodes policy pattern)
--   - Realtime            : published so the homepage updates when an admin
--                           creates/updates an announcement
--   - updated_at trigger  : auto-bump on UPDATE
-- ============================================================================

-- ============================================================================
-- 1. ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast published-feed queries (homepage + list screens)
CREATE INDEX IF NOT EXISTS idx_announcements_published_created
  ON announcements(is_published, created_at DESC);

-- ============================================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_announcements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_announcements_updated_at();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view announcements" ON announcements;
CREATE POLICY "Authenticated users can view announcements" ON announcements
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
CREATE POLICY "Admins can insert announcements" ON announcements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements" ON announcements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
CREATE POLICY "Admins can delete announcements" ON announcements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================================
-- 4. REALTIME PUBLICATION
-- Homepage subscribes to announcement changes so a newly published
-- announcement appears live without a manual refresh.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  END IF;
END $$;

-- ============================================================================
-- Migration: App settings (admin-configurable, persisted key/value store)
--
-- Backs the redesigned Admin Settings page. Settings are real rows that the
-- admin toggles/edit and that actually change app/server behavior:
--
--   - auto_publish_episodes : gates the `auto_live_episodes()` pg_cron job
--   - notify_on_episode_live: gates the `notify_episode_live_webhook()` trigger
--   - allow_dish_photos     : gates dish-photo posting in the user app
--   - allow_comments        : gates post comments in the user app
--   - app_display_name      : brand name shown in the admin sidebar
--   - support_email         : support contact the admin configures
--
--   - RLS                 : everyone reads (feature flags aren't sensitive and
--                           the user-facing gates need them); only admins write
--   - Realtime            : published so gates update live across the app
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. APP_SETTINGS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_app_settings_updated_at();

-- ---------------------------------------------------------------------------
-- 3. SEED DEFAULTS
-- Every admin-configurable setting exists even before it is first saved, so
-- reads fall back to a sane default instead of an empty result.
-- ---------------------------------------------------------------------------
INSERT INTO app_settings (key, value) VALUES
  ('app_display_name',      '"Foodilicious Live"'),
  ('support_email',         '""'),
  ('auto_publish_episodes', 'true'),
  ('notify_on_episode_live','true'),
  ('allow_dish_photos',     'true'),
  ('allow_comments',        'true')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Read is open to everyone (anon + authenticated): feature flags are not
-- sensitive and user-facing screens gate behavior on them.
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings
  FOR SELECT USING (true);

-- Only admins can change settings.
DROP POLICY IF EXISTS "Admins can insert app settings" ON app_settings;
CREATE POLICY "Admins can insert app settings" ON app_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update app settings" ON app_settings;
CREATE POLICY "Admins can update app settings" ON app_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete app settings" ON app_settings;
CREATE POLICY "Admins can delete app settings" ON app_settings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ---------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- Admin list + user-facing gates update live when a setting changes.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. SETTING READER (for triggers / RPCs)
-- Returns the raw jsonb value, or NULL when unset so callers can COALESCE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = p_key;
$$;

-- Convenience boolean reader used by the gates below and the client RPC.
CREATE OR REPLACE FUNCTION public.get_app_setting_bool(p_key TEXT, p_default BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.get_app_setting(p_key) #>> '{}')::BOOLEAN, p_default);
$$;

-- ---------------------------------------------------------------------------
-- 7. SERVER GATES
-- ---------------------------------------------------------------------------

-- auto_live_episodes: the pg_cron job that flips scheduled episodes live at
-- their scheduled time. Now honors the admin's "Auto-publish episodes" toggle
-- (disabled → no-op, so nothing goes live automatically). The manual Live
-- Control toggle is a direct UPDATE and is unaffected.
CREATE OR REPLACE FUNCTION public.auto_live_episodes()
RETURNS SETOF episodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Honor the admin "Auto-publish episodes" setting (missing → default true).
  IF NOT public.get_app_setting_bool('auto_publish_episodes') THEN
    RETURN;
  END IF;

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
$$;

-- notify_episode_live_webhook: the trigger that fires `notify-episode-live`
-- when an episode flips to live. Now honors the admin's "Notify on episode
-- live" toggle (disabled → no push/email is sent for go-live).
CREATE OR REPLACE FUNCTION public.notify_episode_live_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Change this if the Supabase project URL ever changes.
  edge_url text := 'https://iwcbjwotmpoxgorqflpx.supabase.co/functions/v1/notify-episode-live';
BEGIN
  -- Honor the admin "Notify on episode live" setting (missing → default true).
  IF NOT public.get_app_setting_bool('notify_on_episode_live') THEN
    RETURN NEW;
  END IF;

  -- Only react to the scheduled→live transition (re-lives are guarded by the
  -- send-once flag inside the edge function, so they are not re-notified).
  IF NEW.status = 'live' AND (OLD.status IS DISTINCT FROM 'live') THEN
    PERFORM net.http_post(
      url := edge_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('episodeId', NEW.id),
      timeout_milliseconds := 60000
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. CRON STATUS RPC (System section of the settings page)
-- Lists the installed pg_cron jobs so the admin can verify scheduling is alive.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_status()
RETURNS TABLE (
  jobname TEXT,
  schedule TEXT,
  command TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobname::TEXT, schedule::TEXT, command::TEXT
  FROM cron.job
  ORDER BY jobname;
$$;

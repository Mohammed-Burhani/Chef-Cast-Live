-- ============================================================================
-- Migration: Push notifications infrastructure
--
-- Adds everything needed to notify every user the moment an episode goes live:
--
--   1. Allow 'web' push tokens (table already exists for ios/android)
--   2. Track whether the "episode is live" notification was already sent
--   3. Fire the `notify-episode-live` edge function when an episode's status
--      flips to 'live' (via pg_net — async, non-blocking)
--   4. Auto-go-live scheduled episodes with pg_cron, so go-live + notification
--      happen on time even when no admin app is open
--
-- The edge function must be deployed before this migration takes effect:
--   supabase functions deploy notify-episode-live --no-verify-jwt
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Widen push_tokens.platform to accept web tokens
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_tokens DROP CONSTRAINT IF EXISTS push_tokens_platform_check;
ALTER TABLE public.push_tokens
  ADD CONSTRAINT push_tokens_platform_check
  CHECK (platform IN ('ios', 'android', 'web'));

-- ---------------------------------------------------------------------------
-- 2. Send-once guard for live notifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS live_notification_sent BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. pg_net: lets a trigger issue an async HTTP call to the edge function
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net;

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

DROP TRIGGER IF EXISTS on_episode_live_notify ON public.episodes;
CREATE TRIGGER on_episode_live_notify
  AFTER UPDATE OF status ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_episode_live_webhook();

-- ---------------------------------------------------------------------------
-- 4. pg_cron: transition scheduled episodes to live at their scheduled time
--    (server-side guarantee — previously this only happened while an admin had
--     the app open)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any previous version of the job so re-running this migration is safe.
-- cron.unschedule(jobname) is SECURITY DEFINER and takes the name directly, so
-- no SELECT privilege on cron.job is required. (The previous version read
-- cron.job and failed with "permission denied for table job" 42501 for any
-- non-superuser role.) Returns false if no such job exists — safe to re-run.
SELECT cron.unschedule('auto-live-episodes');

SELECT cron.schedule(
  'auto-live-episodes',
  '* * * * *',              -- every minute
  $$SELECT public.auto_live_episodes();$$
);

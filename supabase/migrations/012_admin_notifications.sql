-- ============================================================================
-- Migration: Admin-scheduled push notifications
--
-- Lets the admin author a notification, pick an audience (all users or a
-- specific list), personalize the copy per-user with a {name} placeholder,
-- and schedule when it is sent.
--
--   - admin_notifications     : the admin-authored campaign (template + target
--                               + schedule + send status)
--   - notification_deliveries : one row per recipient — the personalized copy
--                               (the user's in-app inbox) AND the delivery log
--   - RLS                     : admins manage campaigns; each user reads/updates
--                               only their own deliveries
--   - Scheduler               : pg_cron every minute posts any due campaign to
--                               the `send-admin-notification` edge function via
--                               pg_net (same pattern as auto-live-episodes)
--   - Realtime                : both tables published so the admin list and the
--                               user inbox update live
--
-- The edge function must be deployed before this migration takes effect:
--   supabase functions deploy send-admin-notification --no-verify-jwt
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADMIN_NOTIFICATIONS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  target_user_ids UUID[] DEFAULT '{}',
  deep_link TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast sweep for the cron job (due, still-scheduled campaigns).
CREATE INDEX IF NOT EXISTS idx_admin_notifications_due
  ON admin_notifications(scheduled_at)
  WHERE status = 'scheduled';

-- ---------------------------------------------------------------------------
-- 2. NOTIFICATION_DELIVERIES TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  push_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (push_status IN ('pending', 'sent', 'failed', 'no_token')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (notification_id, user_id)
);

-- Fast inbox query (per user, newest first) + unread-count query.
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user
  ON notification_deliveries(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER (admin_notifications)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_admin_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_admin_notifications_updated_at ON public.admin_notifications;
CREATE TRIGGER set_admin_notifications_updated_at
  BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_notifications_updated_at();

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin notifications" ON admin_notifications;
CREATE POLICY "Admins can view admin notifications" ON admin_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can insert admin notifications" ON admin_notifications;
CREATE POLICY "Admins can insert admin notifications" ON admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update admin notifications" ON admin_notifications;
CREATE POLICY "Admins can update admin notifications" ON admin_notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete admin notifications" ON admin_notifications;
CREATE POLICY "Admins can delete admin notifications" ON admin_notifications
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Each user can see (and mark-read) only their own deliveries.
DROP POLICY IF EXISTS "Users can view own notification deliveries" ON notification_deliveries;
CREATE POLICY "Users can view own notification deliveries" ON notification_deliveries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification deliveries" ON notification_deliveries;
CREATE POLICY "Users can update own notification deliveries" ON notification_deliveries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read every delivery (delivery stats on the campaign).
DROP POLICY IF EXISTS "Admins can view all notification deliveries" ON notification_deliveries;
CREATE POLICY "Admins can view all notification deliveries" ON notification_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ---------------------------------------------------------------------------
-- 5. SCHEDULER — pg_cron + pg_net
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Posts every due, still-scheduled campaign to the edge function, which claims
-- it atomically (scheduled → sending) so concurrent sweeps never double-send.
CREATE OR REPLACE FUNCTION public.send_due_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Change this if the Supabase project URL ever changes.
  edge_url text := 'https://iwcbjwotmpoxgorqflpx.supabase.co/functions/v1/send-admin-notification';
  n record;
BEGIN
  FOR n IN
    SELECT id
    FROM admin_notifications
    WHERE status = 'scheduled'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT 50
  LOOP
    PERFORM net.http_post(
      url := edge_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notificationId', n.id),
      timeout_milliseconds := 60000
    );
  END LOOP;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any previous version of the job so re-running this migration is safe.
-- (cron.unschedule throws XX000 if the job doesn't exist yet; catch it.)
DO $$
BEGIN
  PERFORM cron.unschedule('send-scheduled-notifications');
EXCEPTION WHEN OTHERS THEN
  -- First run — job doesn't exist yet, safe to ignore.
  RAISE NOTICE 'No existing cron job send-scheduled-notifications to remove (first run)';
END $$;

SELECT cron.schedule(
  'send-scheduled-notifications',
  '* * * * *',                 -- every minute
  $$SELECT public.send_due_notifications();$$
);

-- ---------------------------------------------------------------------------
-- 6. REALTIME PUBLICATION
-- Admin list and the user inbox update live when rows change.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notification_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_deliveries;
  END IF;
END $$;

-- ============================================================================
-- Migration: Live episode EMAIL notifications
--
-- Adds what the `notify-episode-live` edge function needs to also EMAIL every
-- opted-in user the moment an episode goes live (nodemailer over SMTP):
--
--   1. profiles.email_notifications_enabled — per-user opt-out. The go-live
--      email's "Unsubscribe" button deep-links into the app (or website) which
--      flips this to false. Defaults to true so existing users are opted in.
--   2. episodes.live_email_sent — send-once guard for the go-live EMAIL,
--      independent of the push guard (live_notification_sent) so the push and
--      email channels can each be claimed/retried separately.
--
-- The existing "Users can update own profile" RLS policy already allows a user
-- to update email_notifications_enabled on their own row, so no policy change
-- is required here.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS live_email_sent BOOLEAN NOT NULL DEFAULT false;

/**
 * Edge Function: notify-episode-live
 *
 * Sends a push notification AND an email to every registered user when an
 * episode goes live.
 *
 * Triggered automatically by the `on_episode_live_notify` database trigger
 * (see supabase/migrations/006_push_notifications.sql) the moment an episode's
 * status flips to 'live'. Can also be POSTed to manually.
 *
 * Request body: { episodeId: string }
 *
 * All logic lives in ./push-logic.ts (shared with the test suite); this file
 * is just the Deno wiring + the nodemailer transport.
 *
 * Guarantees:
 *  - Sends at most once per episode per channel (atomic `live_notification_sent`
 *    for push, `live_email_sent` for email)
 *  - Delivers through the Expo Push service, so users receive it even when the
 *    app is closed
 *  - Emails every opted-in user (profiles.email_notifications_enabled) via SMTP
 *  - Cleans up push tokens Expo reports as invalid/unregistered
 *  - A mail failure never blocks the push (email is best-effort)
 *
 * Deploy with JWT verification disabled — it is called by the database, not by
 * the client:
 *   supabase functions deploy notify-episode-live --no-verify-jwt
 *
 * Env secrets (Supabase Dashboard → Edge Functions → notify-episode-live →
 * Secrets):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE,
 *   EMAIL_FROM (e.g. "Foodilicious <noreply@foodilicious.app>"),
 *   WEB_APP_URL (https://<your-vercel-domain> — used for the "Website" button
 *     and the List-Unsubscribe header),
 *   EXPO_ACCESS_TOKEN (required for web push recipients)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import nodemailer from 'npm:nodemailer@6.9.14';
import { handleRequest, type MailSender } from './push-logic.ts';

/**
 * Builds a nodemailer-backed MailSender, or undefined when SMTP isn't
 * configured (in which case the email channel is skipped by the handler).
 * The transport is created once and reused across every recipient.
 */
function createMailSender(getEnv: (key: string) => string | undefined): MailSender | undefined {
  const host = getEnv('SMTP_HOST');
  if (!host) return undefined;

  const from = getEnv('EMAIL_FROM') ?? 'Foodilicious <noreply@foodilicious.app>';
  let transport: nodemailer.Transporter | null = null;

  return async ({ to, subject, html, text, headers }) => {
    if (!transport) {
      transport = nodemailer.createTransport({
        host,
        port: Number(getEnv('SMTP_PORT') ?? '587'),
        secure: (getEnv('SMTP_SECURE') ?? '').toLowerCase() === 'true',
        auth:
          getEnv('SMTP_USER') && getEnv('SMTP_PASS')
            ? { user: getEnv('SMTP_USER')!, pass: getEnv('SMTP_PASS')! }
            : undefined,
        pool: true,
        maxConnections: 1,
      });
    }

    await transport.sendMail({ from, to, subject, html, text, headers });
  };
}

serve((req) =>
  handleRequest(req, {
    supabaseClient: createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ),
    getEnv: (key) => Deno.env.get(key),
    fetchFn: fetch,
    sendMail: createMailSender((key) => Deno.env.get(key)),
  }),
);

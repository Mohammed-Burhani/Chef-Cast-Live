/**
 * Edge Function: send-admin-notification
 *
 * Sends an admin-authored, personalized push notification (plus an in-app
 * delivery row per recipient) to a campaign's audience.
 *
 * Triggered automatically by the `send-scheduled-notifications` pg_cron job via
 * pg_net the moment a campaign's `scheduled_at` arrives. Can also be POSTed to
 * directly from the admin dashboard for an immediate "Send Now".
 *
 * Request body: { notificationId: string }
 *
 * All logic lives in ./logic.ts (shared with the test suite); this file is just
 * the Deno wiring.
 *
 * Guarantees:
 *  - Sends at most once per campaign (atomic `scheduled → sending` claim)
 *  - Resolves the audience ('all' non-admins, or a specific user list)
 *  - Personalizes `{name}` → the recipient's username in title/body
 *  - Writes a `notification_deliveries` row per recipient (the user's in-app
 *    inbox + the delivery log) even when the user has no push token
 *  - Delivers through the Expo Push service, so users receive it even when the
 *    app is closed
 *  - Cleans up push tokens Expo reports as invalid/unregistered
 *
 * Deploy with JWT verification disabled — it is called by the database, not by
 * the client:
 *   supabase functions deploy send-admin-notification --no-verify-jwt
 *
 * Env secrets (Supabase Dashboard → Edge Functions →
 * send-admin-notification → Secrets):
 *   EXPO_ACCESS_TOKEN (required for web push recipients)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleRequest } from './logic.ts';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve((req) =>
  handleRequest(req, {
    supabaseClient,
    getEnv: (key) => Deno.env.get(key),
    fetchFn: fetch,
    verifyAdmin: async (authHeader) => {
      // Cron path (pg_net) sends no Authorization header — it is trusted.
      if (!authHeader) return true;

      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!token) return false;

      try {
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (!user) return false;
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        return profile?.is_admin === true;
      } catch {
        return false;
      }
    },
  }),
);

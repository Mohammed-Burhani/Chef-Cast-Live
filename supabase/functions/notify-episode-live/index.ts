/**
 * Edge Function: notify-episode-live
 *
 * Sends a push notification to every registered user when an episode goes live.
 *
 * Triggered automatically by the `on_episode_live_notify` database trigger
 * (see supabase/migrations/006_push_notifications.sql) the moment an episode's
 * status flips to 'live'. Can also be POSTed to manually.
 *
 * Request body: { episodeId: string }
 *
 * All logic lives in ./push-logic.ts (shared with the test suite); this file
 * is just the Deno wiring.
 *
 * Guarantees:
 *  - Sends at most once per episode (atomic `live_notification_sent` claim)
 *  - Delivers through the Expo Push service, so users receive it even when the
 *    app is closed
 *  - Cleans up push tokens Expo reports as invalid/unregistered
 *
 * Deploy with JWT verification disabled — it is called by the database, not by
 * the client:
 *   supabase functions deploy notify-episode-live --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleRequest } from './push-logic.ts';

serve((req) =>
  handleRequest(req, {
    supabaseClient: createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ),
    getEnv: (key) => Deno.env.get(key),
    fetchFn: fetch,
  }),
);

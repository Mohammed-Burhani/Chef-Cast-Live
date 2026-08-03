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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_TOKENS_PER_REQUEST = 100; // Expo Push API hard limit

// Optional but recommended for production traffic (Expo dashboard → Access tokens).
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface EpisodeRow {
  id: string;
  title: string;
  status: string;
  is_live: boolean;
  live_notification_sent: boolean;
}

interface PushTokenRow {
  id: string;
  token: string;
}

interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const episodeId = (body as { episodeId?: unknown }).episodeId;

    if (typeof episodeId !== 'string' || !episodeId) {
      return json({ error: 'Missing episodeId' }, 400);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1) Load the episode
    const { data: episode, error: episodeError } = await supabaseClient
      .from('episodes')
      .select('id, title, status, is_live, live_notification_sent')
      .eq('id', episodeId)
      .single<EpisodeRow>();

    if (episodeError || !episode) {
      return json({ error: 'Episode not found' }, 404);
    }

    // Only ever notify for an episode that is genuinely live.
    if (episode.status !== 'live' || !episode.is_live) {
      return json({ error: 'Episode is not live' }, 409);
    }

    // 2) Atomically claim the "send once" flag. If zero rows were updated,
    //    another invocation already sent — skip without double-notifying.
    const { data: claimed, error: claimError } = await supabaseClient
      .from('episodes')
      .update({ live_notification_sent: true })
      .eq('id', episodeId)
      .eq('live_notification_sent', false)
      .select('id');

    if (claimError) {
      throw claimError;
    }
    if (!claimed || claimed.length === 0) {
      return json({ ok: true, skipped: 'already_sent' });
    }

    // 3) Fetch every registered push token
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('id, token');

    if (tokensError) {
      throw tokensError;
    }
    if (!tokens || tokens.length === 0) {
      return json({ ok: true, sent: 0 });
    }

    // 4) Build the push message
    const data = {
      type: 'episode-live',
      episodeId: episode.id,
      episodeTitle: episode.title,
      url: `/episode/${episode.id}`, // used by the web service worker
    };

    const message = {
      title: `🍳 ${episode.title} is LIVE!`,
      body: 'Tap to join the live cooking quiz now!',
      data,
      sound: 'default',
      channelId: 'default', // Android channel created at app start
      priority: 'high',
    };

    // 5) Send in batches of ≤100 tokens
    let sent = 0;
    const invalidTokenIds: string[] = [];

    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_REQUEST) {
      const chunk = tokens.slice(i, i + MAX_TOKENS_PER_REQUEST);

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          to: chunk.map((t) => t.token),
          ...message,
        }),
      });

      const result = await response.json().catch(() => ({ data: [] }));

      for (const [idx, receipt] of (result.data as ExpoReceipt[] | undefined)?.entries() ?? []) {
        if (receipt.status === 'ok') {
          sent += 1;
          continue;
        }

        const errorCode = receipt.details?.error;
        if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidPushToken') {
          const token = chunk[idx];
          if (token?.id) invalidTokenIds.push(token.id);
        }
      }
    }

    // 6) Drop tokens that can no longer receive pushes
    if (invalidTokenIds.length > 0) {
      await supabaseClient.from('push_tokens').delete().in('id', invalidTokenIds);
    }

    return json({
      ok: true,
      sent,
      totalTokens: tokens.length,
      invalidTokensRemoved: invalidTokenIds.length,
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return json({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});

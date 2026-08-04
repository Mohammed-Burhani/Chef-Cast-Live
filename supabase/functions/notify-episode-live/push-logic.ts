/**
 * Shared push-notification logic for the "episode is live" flow.
 *
 * Environment-agnostic (no Deno / Node globals touched at import time), so the
 * exact same file is used by the deployed edge function (Deno) and the local
 * test runner (`bun test`). The Deno-only wiring — `Deno.env`, `createClient`,
 * `serve` — lives in the function entry point; everything testable lives here.
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const MAX_TOKENS_PER_REQUEST = 100; // Expo Push API hard limit

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface EpisodeRow {
  id: string;
  title: string;
  status: string;
  is_live: boolean;
  live_notification_sent: boolean;
}

export interface PushTokenRow {
  id: string;
  token: string;
}

export interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/** Only ever notify for an episode that is genuinely live. */
export function isEpisodeLive(episode: Pick<EpisodeRow, 'status' | 'is_live'>): boolean {
  return episode.status === 'live' && episode.is_live === true;
}

/**
 * Builds the Expo push message for a live episode.
 *
 * Works for iOS / Android / web:
 *  - `channelId` — Android channel created at app start (`ensureAndroidChannel`)
 *  - `sound`, `priority` — Android display behaviour
 *  - `data.url` — used by the web service worker to open the episode page
 */
export function buildPushMessage(episode: { id: string; title: string }) {
  return {
    title: `🍳 ${episode.title} is LIVE!`,
    body: 'Tap to join the live cooking quiz now!',
    data: {
      type: 'episode-live',
      episodeId: episode.id,
      episodeTitle: episode.title,
      url: `/episode/${episode.id}`,
    },
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  };
}

/** Expo allows at most 100 tokens per /send request. */
export function chunkTokens(tokens: PushTokenRow[], max = MAX_TOKENS_PER_REQUEST): PushTokenRow[][] {
  const chunks: PushTokenRow[][] = [];
  for (let i = 0; i < tokens.length; i += max) {
    chunks.push(tokens.slice(i, i + max));
  }
  return chunks;
}

/**
 * Interprets Expo's per-token receipts for one sent chunk.
 *  - `status: 'ok'` counts as delivered
 *  - `DeviceNotRegistered` / `InvalidPushToken` → token is dead, delete it
 *  - any other error is transient (rate limit, server error…) and left alone
 */
export function processExpoReceipts(
  receipts: ExpoReceipt[] | undefined,
  chunk: PushTokenRow[],
): { sent: number; invalidTokenIds: string[] } {
  let sent = 0;
  const invalidTokenIds: string[] = [];

  for (const [index, receipt] of (receipts ?? []).entries()) {
    if (receipt?.status === 'ok') {
      sent += 1;
      continue;
    }

    const errorCode = receipt?.details?.error;
    if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidPushToken') {
      const row = chunk[index];
      if (row?.id) invalidTokenIds.push(row.id);
    }
  }

  return { sent, invalidTokenIds };
}

/** Minimal surface the handler needs from the Supabase client. */
export interface HandlerDeps {
  supabaseClient: {
    from: (table: string) => any;
  };
  getEnv: (key: string) => string | undefined;
  fetchFn: (url: string, init?: any) => Promise<any>;
}

/**
 * The "episode is live" notification handler — everything except the Deno
 * `serve` wrapper. Posting `{ episodeId }` notifies every registered token.
 *
 * Guarantees:
 *  - sends at most once per episode (atomic `live_notification_sent` claim)
 *  - batches sends to ≤100 tokens per Expo request
 *  - deletes tokens Expo reports as invalid/unregistered
 */
export async function handleRequest(req: Request, deps: HandlerDeps): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const episodeId = (body as { episodeId?: unknown }).episodeId;

    if (typeof episodeId !== 'string' || !episodeId) {
      return json({ error: 'Missing episodeId' }, 400);
    }

    // 1) Load the episode
    const { data: episode, error: episodeError } = await deps.supabaseClient
      .from('episodes')
      .select('id, title, status, is_live, live_notification_sent')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return json({ error: 'Episode not found' }, 404);
    }

    // Only ever notify for an episode that is genuinely live.
    if (!isEpisodeLive(episode)) {
      return json({ error: 'Episode is not live' }, 409);
    }

    // 2) Atomically claim the "send once" flag. If zero rows were updated,
    //    another invocation already sent — skip without double-notifying.
    const { data: claimed, error: claimError } = await deps.supabaseClient
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
    const { data: tokens, error: tokensError } = await deps.supabaseClient
      .from('push_tokens')
      .select('id, token');

    if (tokensError) {
      throw tokensError;
    }
    if (!tokens || tokens.length === 0) {
      return json({ ok: true, sent: 0 });
    }

    // 4) Build the push message
    const message = buildPushMessage(episode);
    const expoAccessToken = deps.getEnv('EXPO_ACCESS_TOKEN');

    // 5) Send in batches of ≤100 tokens
    let sent = 0;
    const invalidTokenIds: string[] = [];

    for (const chunk of chunkTokens(tokens)) {
      const response = await deps.fetchFn(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
        },
        body: JSON.stringify({
          to: chunk.map((t) => t.token),
          ...message,
        }),
      });

      const result = await response.json().catch(() => ({ data: [] }));
      const { sent: chunkSent, invalidTokenIds: chunkInvalid } = processExpoReceipts(
        result.data,
        chunk,
      );
      sent += chunkSent;
      invalidTokenIds.push(...chunkInvalid);
    }

    // 6) Drop tokens that can no longer receive pushes
    if (invalidTokenIds.length > 0) {
      await deps.supabaseClient.from('push_tokens').delete().in('id', invalidTokenIds);
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
}

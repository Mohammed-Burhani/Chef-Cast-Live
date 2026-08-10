/**
 * Shared Expo Push helpers for edge functions.
 *
 * Imported by `send-admin-notification`. `notify-episode-live/push-logic.ts`
 * carries its own copies of these (its tests import them directly) — keep the
 * behaviour in sync if anything changes here.
 *
 * Environment-agnostic: no Deno / Node globals touched at import time, so the
 * exact same file is used by the deployed edge function (Deno) and the local
 * test runner (`bun test`).
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

export interface PushTokenRow {
  id: string;
  token: string;
}

export interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
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

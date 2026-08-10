/**
 * Shared push-notification logic for the "send an admin-scheduled notification"
 * flow.
 *
 * Environment-agnostic (no Deno / Node globals touched at import time), so the
 * exact same file is used by the deployed edge function (Deno) and the local
 * test runner (`bun test`). The Deno-only wiring — `Deno.env`, `createClient`,
 * `serve` — lives in the function entry point; everything testable lives here.
 *
 * Request body: { notificationId: string }
 *
 * Behaviour:
 *  - Sends at most once per campaign (atomic `scheduled → sending` claim)
 *  - Resolves the audience ('all' non-admins, or a specific user list)
 *  - Personalizes `{name}` → the recipient's username in title/body
 *  - Writes a `notification_deliveries` row per recipient (the user's in-app
 *    inbox + the delivery log) — even when the user has no push token
 *  - Pushes through the Expo Push service (one request per recipient so each
 *    personalized copy goes to exactly its owner)
 *  - Deletes tokens Expo reports as invalid/unregistered
 *  - Total failure before Expo accepts anything → `failed` (admin can retry);
 *    partial sends stay `sent` so nobody is double-notified
 */

import {
  EXPO_PUSH_URL,
  chunkTokens,
  corsHeaders,
  json,
  processExpoReceipts,
  type PushTokenRow,
} from '../_shared/push.ts';

/** The audience modes stored on `admin_notifications.target_type`. */
export type TargetType = 'all' | 'specific';

export interface AdminNotificationRow {
  id: string;
  title: string;
  body: string;
  target_type: TargetType;
  target_user_ids: string[] | null;
  deep_link: string | null;
  scheduled_at: string;
  status: string;
  sent_count: number;
}

export interface ProfileRow {
  id: string;
  username: string;
}

export interface PushTokenWithUser extends PushTokenRow {
  user_id: string;
}

/**
 * Replaces every `{name}` placeholder with the recipient's username.
 * Any other `{...}` tokens are left untouched.
 */
export function personalize(template: string, username: string): string {
  return template.replace(/\{name\}/g, username);
}

/**
 * Builds the Expo push message for one recipient. The personalized title/body
 * are baked in here, so each recipient is sent in their own request.
 */
export function buildPushMessage(input: {
  title: string;
  body: string;
  notificationId: string;
  deepLink?: string | null;
}) {
  return {
    title: input.title,
    body: input.body,
    data: {
      type: 'admin-notification',
      notificationId: input.notificationId,
      url: input.deepLink || undefined,
    },
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  };
}

/** Minimal surface the handler needs from the Supabase client. */
export interface HandlerDeps {
  supabaseClient: {
    from: (table: string) => any;
    schema?: (schema: string) => { from: (table: string) => any };
  };
  getEnv: (key: string) => string | undefined;
  fetchFn: (url: string, init?: any) => Promise<any>;
  /**
   * Optional caller check used when the function is invoked directly by an
   * admin (as opposed to the cron sweep, which sends no Authorization header).
   * Resolves to `true` when the caller may send notifications.
   */
  verifyAdmin?: (authorizationHeader: string | null) => Promise<boolean>;
}

/** Atomically flips a campaign into a terminal-ish state; guards double sends. */
async function claim(deps: HandlerDeps, id: string, from: string, to: string): Promise<boolean> {
  const { data, error } = await deps.supabaseClient
    .from('admin_notifications')
    .update({ status: to })
    .eq('id', id)
    .eq('status', from)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

/** Marks the campaign sent (successful or partial). */
async function markSent(
  deps: HandlerDeps,
  id: string,
  sentCount: number,
): Promise<void> {
  const { error } = await deps.supabaseClient
    .from('admin_notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: sentCount, error: null })
    .eq('id', id);
  if (error) throw error;
}

/** Marks the campaign failed so an admin can retry it later. */
async function markFailed(
  deps: HandlerDeps,
  id: string,
  message: string,
): Promise<void> {
  const { error } = await deps.supabaseClient
    .from('admin_notifications')
    .update({ status: 'failed', error: message })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Resolves the recipient profile rows for a campaign.
 *  - 'all'      → every non-admin profile
 *  - 'specific' → the profiles named in target_user_ids
 */
export async function resolveRecipients(
  deps: HandlerDeps,
  notification: Pick<AdminNotificationRow, 'target_type' | 'target_user_ids'>,
): Promise<ProfileRow[]> {
  if (notification.target_type === 'specific') {
    const ids = Array.isArray(notification.target_user_ids) ? notification.target_user_ids : [];
    if (ids.length === 0) return [];
    const { data, error } = await deps.supabaseClient
      .from('profiles')
      .select('id, username')
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  }

  const { data, error } = await deps.supabaseClient
    .from('profiles')
    .select('id, username')
    .eq('is_admin', false);
  if (error) throw error;
  return data ?? [];
}

/**
 * Inserts one `notification_deliveries` row per recipient (idempotent), so every
 * targeted user has an in-app copy of the notification even without a token.
 */
export async function insertDeliveries(
  deps: HandlerDeps,
  notificationId: string,
  notification: Pick<AdminNotificationRow, 'title' | 'body' | 'deep_link'>,
  recipients: ProfileRow[],
  hasToken: (userId: string) => boolean,
): Promise<void> {
  const rows = recipients.map((r) => ({
    notification_id: notificationId,
    user_id: r.id,
    title: personalize(notification.title, r.username),
    body: personalize(notification.body, r.username),
    deep_link: notification.deep_link,
    push_status: hasToken(r.id) ? 'pending' : 'no_token',
  }));

  const { error } = await deps.supabaseClient
    .from('notification_deliveries')
    .upsert(rows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/**
 * Sends each recipient's tokens to Expo, returning per-user results and any
 * invalid tokens to clean up. Throws if the very first Expo request fails (so
 * the caller can mark the campaign failed); later failures degrade to `failed`
 * for that recipient only.
 */
export async function sendToExpo(
  deps: HandlerDeps,
  notification: Pick<AdminNotificationRow, 'id' | 'title' | 'body' | 'deep_link'>,
  recipients: ProfileRow[],
  tokensByUser: Map<string, PushTokenWithUser[]>,
): Promise<{ statusByUser: Map<string, 'sent' | 'failed'>; invalidTokenIds: string[] }> {
  const expoAccessToken = deps.getEnv('EXPO_ACCESS_TOKEN');
  const invalidTokenIds: string[] = [];
  const statusByUser = new Map<string, 'sent' | 'failed'>();
  let completedExpoRequests = 0;

  for (const recipient of recipients) {
    const tokens = tokensByUser.get(recipient.id) ?? [];
    if (tokens.length === 0) continue; // no token → already 'no_token'

    const message = buildPushMessage({
      title: personalize(notification.title, recipient.username),
      body: personalize(notification.body, recipient.username),
      notificationId: notification.id,
      deepLink: notification.deep_link,
    });

    let recipientOk = false;
    for (const chunk of chunkTokens(tokens)) {
      const response = await deps.fetchFn(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
        },
        body: JSON.stringify({ to: chunk.map((t) => t.token), ...message }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        // A failure on the very first request means nothing was delivered —
        // surface it so the whole campaign can be retried.
        if (completedExpoRequests === 0) {
          const detail =
            result && typeof result === 'object' && 'errors' in result
              ? JSON.stringify((result as { errors?: unknown }).errors)
              : response.statusText;
          throw new Error(`Expo push request failed (${response.status}): ${detail}`);
        }
        continue;
      }

      if (!result || typeof result !== 'object' || !Array.isArray((result as { data?: unknown }).data)) {
        if (completedExpoRequests === 0) {
          throw new Error('Expo push response did not include a receipts array');
        }
        continue;
      }

      completedExpoRequests += 1;
      const { sent: chunkSent, invalidTokenIds: chunkInvalid } = processExpoReceipts(
        (result as { data: any }).data,
        chunk,
      );
      invalidTokenIds.push(...chunkInvalid);
      if (chunkSent > 0) recipientOk = true;
    }

    statusByUser.set(recipient.id, recipientOk ? 'sent' : 'failed');
  }

  return { statusByUser, invalidTokenIds };
}

/** Marks the per-recipient push result on `notification_deliveries`. */
export async function updateDeliveryStatuses(
  deps: HandlerDeps,
  notificationId: string,
  statusByUser: Map<string, 'sent' | 'failed'>,
): Promise<void> {
  const sentIds: string[] = [];
  const failedIds: string[] = [];
  for (const [userId, status] of statusByUser) {
    (status === 'sent' ? sentIds : failedIds).push(userId);
  }

  const run = async (ids: string[], status: string) => {
    if (ids.length === 0) return;
    const { error } = await deps.supabaseClient
      .from('notification_deliveries')
      .update({ push_status: status })
      .eq('notification_id', notificationId)
      .in('user_id', ids);
    if (error) throw error;
  };

  await run(sentIds, 'sent');
  await run(failedIds, 'failed');
}

/**
 * The "send an admin-scheduled notification" handler — everything except the
 * Deno `serve` wrapper. Posting `{ notificationId }` sends a personalized push
 * (and an in-app delivery row) to the campaign's audience.
 */
export async function handleRequest(req: Request, deps: HandlerDeps): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Optional hardening: when a caller presents an Authorization header it must
  // belong to an admin. The cron path (pg_net) sends no header and is trusted.
  if (deps.verifyAdmin) {
    const allowed = await deps.verifyAdmin(req.headers.get('Authorization'));
    if (!allowed) return json({ error: 'Unauthorized' }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = (body as { notificationId?: unknown }).notificationId;

    if (typeof notificationId !== 'string' || !notificationId) {
      return json({ error: 'Missing notificationId' }, 400);
    }

    // 1) Load the campaign
    const { data: notification, error: notifError } = await deps.supabaseClient
      .from('admin_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      return json({ error: 'Notification not found' }, 404);
    }

    // 2) Atomic claim — a campaign is handled exactly once.
    if (!(await claim(deps, notificationId, 'scheduled', 'sending'))) {
      return json({ ok: true, skipped: 'already_handled', status: notification.status });
    }

    // 3) Resolve the audience
    const recipients = await resolveRecipients(deps, notification);
    if (recipients.length === 0) {
      await markSent(deps, notificationId, 0);
      return json({ ok: true, sent: 0, recipients: 0 });
    }

    // 4) Push tokens for those recipients
    const { data: tokens, error: tokensError } = await deps.supabaseClient
      .from('push_tokens')
      .select('id, user_id, token')
      .in('user_id', recipients.map((r) => r.id));
    if (tokensError) throw tokensError;

    const tokensByUser = new Map<string, PushTokenWithUser[]>();
    for (const token of tokens ?? []) {
      const list = tokensByUser.get(token.user_id) ?? [];
      list.push(token);
      tokensByUser.set(token.user_id, list);
    }

    // 5) In-app deliveries for everyone (idempotent), so the inbox has a copy
    //    even when a user has no push token.
    await insertDeliveries(deps, notificationId, notification, recipients, (id) =>
      tokensByUser.has(id),
    );

    // 6) Push via Expo (one request per recipient — each has its own copy).
    try {
      const { statusByUser, invalidTokenIds } = await sendToExpo(
        deps,
        notification,
        recipients,
        tokensByUser,
      );

      // 7) Record per-recipient push results
      await updateDeliveryStatuses(deps, notificationId, statusByUser);

      // 8) Drop tokens that can no longer receive pushes
      if (invalidTokenIds.length > 0) {
        await deps.supabaseClient.from('push_tokens').delete().in('id', invalidTokenIds);
      }

      // 9) Finalize
      await markSent(deps, notificationId, recipients.length);
      return json({
        ok: true,
        sent: recipients.length,
        recipients: recipients.length,
        invalidTokensRemoved: invalidTokenIds.length,
      });
    } catch (error) {
      // Total failure before Expo accepted any request — mark failed so an admin
      // can retry. Partial sends fall through to `sent` and are not re-sent.
      await markFailed(deps, notificationId, (error as Error)?.message ?? String(error));
      throw error;
    }
  } catch (error) {
    console.error('Edge Function error:', error);
    return json({ error: (error as Error).message || 'Internal server error' }, 500);
  }
}

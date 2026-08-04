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
  description?: string | null;
  thumbnail_url?: string | null;
  status: string;
  is_live: boolean;
  live_notification_sent: boolean;
  live_email_sent?: boolean;
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

// ============================================================================
// EMAIL — "episode is live" mailer
//
// All of it runs best-effort after the push channel: a failing SMTP must never
// take down the push notification. Every failure is counted and reported, so
// it is visible in the edge function logs.
// ============================================================================

/** Row shape used by the live-email path. */
export interface EmailEpisode {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
}

/** A fully-assembled email, ready for the transport. */
export interface LiveEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  sent: number;
  failed: number;
  errors: string[];
}

/** The mail-transport surface the handler needs (nodemailer in index.ts). */
export type MailSender = (opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) => Promise<void>;

/** Escape a value so it is safe to interpolate into HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Collapse whitespace and trim a long description for the email body. */
export function truncate(text: string | null | undefined, max = 180): string {
  const cleaned = (text ?? '').trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Builds the go-live email with:
 *  - a highlighted "View Live in App" button   (appDeepLink)
 *  - a "View Live on the Website" button        (webUrl)
 *  - an unsubscribe link                        (unsubscribeUrl)
 */
export function buildLiveEmail(
  episode: EmailEpisode,
  links: { appDeepLink: string; webUrl: string; unsubscribeUrl: string },
): LiveEmail {
  const title = escapeHtml(episode.title);
  const description = escapeHtml(truncate(episode.description));
  const appButton = emailButton('View Live in App', links.appDeepLink, '#0D0D0D', '#FFB347');
  const webButton = emailButton('View Live on the Website', links.webUrl, '#0D0D0D', '#F5E9D0');
  const thumbnailHtml = episode.thumbnail_url
    ? `<tr><td align="center" style="padding:8px 32px 0;">
         <img src="${escapeHtml(episode.thumbnail_url)}" alt="" width="100%" style="max-width:456px;height:auto;border-radius:12px;display:block;" />
       </td></tr>`
    : '';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0D0D0D;-webkit-text-size-adjust:100%;word-break:break-word;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#1A1A1A;border-radius:16px;">
            <tr>
              <td style="padding:32px 32px 16px;text-align:center;">
                <p style="margin:0;color:#FFB347;font-size:14px;font-weight:bold;letter-spacing:1px;">CHEFCAST: LIVE</p>
                <h1 style="margin:12px 0 0;color:#FFFFFF;font-size:26px;line-height:1.3;">It&rsquo;s live! 🍳</h1>
                <h2 style="margin:8px 0 0;color:#FFB347;font-size:22px;line-height:1.3;">${title}</h2>
              </td>
            </tr>
            ${thumbnailHtml}
            <tr>
              <td style="padding:20px 32px 8px;color:#CFCFCF;font-size:15px;line-height:1.6;">
                ${description || 'The episode is live right now — join the cooking quiz!'}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;text-align:center;">
                ${appButton}
                <p style="font-size:0;line-height:0;margin:0;">&nbsp;</p>
                ${webButton}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;text-align:center;color:#8A8A8A;font-size:12px;line-height:1.6;">
                You&rsquo;re receiving this because you subscribe to ChefCast live alerts.<br />
                <a href="${links.unsubscribeUrl}" style="color:#AAAAAA;text-decoration:underline;">Unsubscribe from live episode emails</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `It's live! 🍳 ${episode.title}`,
    '',
    truncate(episode.description) || 'The episode is live right now — join the cooking quiz!',
    '',
    `Watch in the app: ${links.appDeepLink}`,
    `Watch on the website: ${links.webUrl}`,
    '',
    `Unsubscribe: ${links.unsubscribeUrl}`,
  ].join('\n');

  return {
    subject: `🍳 ${episode.title} is LIVE — watch now!`,
    html,
    text,
  };
}

/** An email-client-safe table-based button (no <div>, no padding on <a> only). */
function emailButton(label: string, href: string, textColor: string, bgColor: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
      <tr>
        <td align="center" style="border-radius:12px;background:${bgColor};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;color:${textColor};text-decoration:none;font-weight:bold;font-size:15px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * Emails for every user who (a) opted in to email notifications and (b) has an
 * email on their auth account. Anonymous/phone-only accounts are skipped, and
 * duplicate emails are de-duplicated.
 */
export async function fetchLiveEmailRecipients(
  supabaseClient: HandlerDeps['supabaseClient'],
): Promise<string[]> {
  // Opted-in profile ids.
  const { data: optedIn, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('email_notifications_enabled', true);

  if (profilesError) throw profilesError;
  if (!optedIn || optedIn.length === 0) return [];

  const userIds = optedIn.map((row: { id: string }) => row.id);

  // Emails live on auth.users (visible to the service role). If the client
  // doesn't expose the auth schema (e.g. an old stub), bail gracefully — the
  // edge function's real client always has it.
  if (typeof supabaseClient.schema !== 'function') {
    return [];
  }

  const { data: users, error: usersError } = await supabaseClient
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('id', userIds);

  if (usersError) throw usersError;

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const user of users ?? []) {
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (email && !seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  return emails;
}

/** Sends one email per recipient, tolerating individual failures. */
export async function sendLiveEmails(
  sendMail: MailSender,
  recipients: string[],
  email: LiveEmail,
  headers?: Record<string, string>,
): Promise<EmailSendResult> {
  const result: EmailSendResult = { sent: 0, failed: 0, errors: [] };
  for (const to of recipients) {
    try {
      await sendMail({ to, subject: email.subject, html: email.html, text: email.text, headers });
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(`to ${to}: ${(error as Error)?.message ?? String(error)}`);
    }
  }
  return result;
}

/** Atomically flips a boolean "sent" guard; true only if THIS call flipped it. */
async function claimOnce(
  deps: HandlerDeps,
  episodeId: string,
  column: 'live_notification_sent' | 'live_email_sent',
): Promise<boolean> {
  const { data, error } = await deps.supabaseClient
    .from('episodes')
    .update({ [column]: true })
    .eq('id', episodeId)
    .eq(column, false)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export type LiveEmailResult = {
  status: 'skipped' | 'already' | 'sent' | 'failed';
  sent?: number;
  failed?: number;
  errors?: string[];
  reason?: string;
};

/**
 * Sends the go-live email to every opted-in user, guarded by the
 * `live_email_sent` claim. Never throws — any failure is captured in the result
 * so the push channel (and the overall request) keeps working.
 */
async function sendEpisodeLiveEmails(deps: HandlerDeps, episode: EpisodeRow): Promise<LiveEmailResult> {
  if (typeof deps.sendMail !== 'function') {
    return { status: 'skipped', reason: 'no_mail_sender' };
  }

  try {
    if (!(await claimOnce(deps, episode.id, 'live_email_sent'))) {
      return { status: 'already' };
    }
  } catch (error) {
    return { status: 'failed', failed: 0, reason: `claim: ${(error as Error)?.message}` };
  }

  try {
    const webUrl = (deps.getEnv('WEB_APP_URL') ?? '').replace(/\/+$/, '');
    const email = buildLiveEmail(
      {
        id: episode.id,
        title: episode.title,
        description: episode.description,
        thumbnail_url: episode.thumbnail_url,
      },
      {
        appDeepLink: `chefcast-live://episode/${episode.id}`,
        webUrl: `${webUrl}/episode/${episode.id}`,
        unsubscribeUrl: 'chefcast-live://email/unsubscribe',
      },
    );

    const recipients = await fetchLiveEmailRecipients(deps.supabaseClient);
    if (recipients.length === 0) {
      return { status: 'sent', sent: 0, failed: 0 };
    }

    // RFC 2369 header so Gmail/Outlook render their own "Unsubscribe" button.
    const listUnsubscribeHeader =
      webUrl.length > 0 ? { 'List-Unsubscribe': `<${webUrl}/email-unsubscribe>` } : undefined;

    const result = await sendLiveEmails(deps.sendMail, recipients, email, listUnsubscribeHeader);
    return {
      status: 'sent',
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };
  } catch (error) {
    return { status: 'failed', failed: 0, reason: (error as Error)?.message ?? String(error) };
  }
}

/** Minimal surface the handler needs from the Supabase client. */
export interface HandlerDeps {
  supabaseClient: {
    from: (table: string) => any;
    schema?: (schema: string) => { from: (table: string) => any };
  };
  getEnv: (key: string) => string | undefined;
  fetchFn: (url: string, init?: any) => Promise<any>;
  /** nodemailer-backed sender (see index.ts). Absent → email channel skipped. */
  sendMail?: MailSender;
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
      .select('id, title, description, thumbnail_url, status, is_live, live_notification_sent, live_email_sent')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return json({ error: 'Episode not found' }, 404);
    }

    // Only ever notify for an episode that is genuinely live.
    if (!isEpisodeLive(episode)) {
      return json({ error: 'Episode is not live' }, 409);
    }

    // 2) EMAIL channel (best-effort — a mail failure must never block the push)
    const emailResult = await sendEpisodeLiveEmails(deps, episode);

    // 3) PUSH channel — atomically claim the "send once" flag. If zero rows
    //    were updated, another invocation already sent the push; skip without
    //    double-notifying.
    if (!(await claimOnce(deps, episodeId, 'live_notification_sent'))) {
      return json({ ok: true, skipped: 'already_sent', email: emailResult });
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
      email: emailResult,
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return json({ error: (error as Error).message || 'Internal server error' }, 500);
  }
}

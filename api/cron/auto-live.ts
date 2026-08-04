/**
 * Vercel Cron — auto-go-live episodes on schedule.
 *
 * Vercel's cron runner (see `crons` in vercel.json) hits this endpoint once a
 * minute. It flips any overdue *scheduled* episode to `live` by calling the
 * Supabase RPC `auto_live_episodes()`. That flip fires the database trigger
 * `on_episode_live_notify`, which posts to the `notify-episode-live` edge
 * function → Expo push → every registered user is notified — even when the app
 * is closed, and without anyone needing the admin app open.
 *
 * This is a belt-and-suspenders duplicate of the Supabase pg_cron job in
 * `supabase/migrations/006_push_notifications.sql`. If one scheduler is down,
 * the other still takes episodes live on time. `auto_live_episodes` only
 * matches episodes still in `scheduled` state, so running both schedulers never
 * double-goes-live an episode, and the edge function's atomic
 * `live_notification_sent` claim guarantees the push itself is sent at most
 * once.
 *
 * Env vars — set in Vercel → Project → Settings → Environment Variables:
 *   SUPABASE_URL                 e.g. https://iwcbjwotmpoxgorqflpx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    the service_role key (Settings → API → service_role)
 */

export default async function handler(req: any, res: any) {
  // Only Vercel's cron runner is allowed in. Vercel sets this header on cron
  // requests; a spoofed request only forces an already-overdue episode live,
  // which is the intended behaviour anyway — so this is a guard, not a secret.
  if (req.headers?.['x-vercel-cron'] !== '1') {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured on Vercel',
    });
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/rpc/auto_live_episodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: '{}',
    });

    const body = response.ok
      ? await response.json().catch(() => [])
      : await response.text().catch(() => 'unknown error');

    res.status(response.status).json({
      ok: response.ok,
      transitioned: response.ok ? body.length : 0,
      detail: response.ok ? undefined : body,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}

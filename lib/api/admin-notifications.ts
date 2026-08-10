/**
 * Admin Notifications API — admin-authored, scheduled, personalized push
 * notifications.
 *
 * A campaign stores a template (`{name}` is replaced with each recipient's
 * username at send time), an audience (all users or a specific list), an
 * optional deep link, and a schedule. Sending is handled by the
 * `send-admin-notification` edge function, fired either on time by the
 * pg_cron sweep or immediately here for "Send Now".
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type AdminNotificationRow = Database['public']['Tables']['admin_notifications']['Row'];
export type AdminNotificationStatus = AdminNotificationRow['status'];

export const MAX_TITLE_WORDS = 15;
export const MAX_BODY_WORDS = 60;

export type AdminNotificationInput = {
  title: string;
  body: string;
  target_type: 'all' | 'specific';
  target_user_ids: string[];
  deep_link?: string | null;
  scheduled_at: string;
};

// ============================================================================
// FETCHERS
// ============================================================================

/** Fetch all campaigns (newest first) — for the admin management page. */
export async function fetchAdminNotifications(): Promise<AdminNotificationRow[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as AdminNotificationRow[];
}

// ============================================================================
// MUTATIONS (admin only — RLS enforces the role)
// ============================================================================

export async function createAdminNotification(
  input: AdminNotificationInput,
  createdBy: string | undefined,
): Promise<AdminNotificationRow> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert({
      title: input.title,
      body: input.body,
      target_type: input.target_type,
      target_user_ids: input.target_user_ids,
      deep_link: input.deep_link || null,
      scheduled_at: input.scheduled_at,
      created_by: createdBy ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AdminNotificationRow;
}

export async function updateAdminNotification(
  id: string,
  updates: Partial<AdminNotificationInput>,
): Promise<AdminNotificationRow> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .update({
      title: updates.title,
      body: updates.body,
      target_type: updates.target_type,
      target_user_ids: updates.target_user_ids,
      deep_link: updates.deep_link,
      scheduled_at: updates.scheduled_at,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as AdminNotificationRow;
}

export async function deleteAdminNotification(id: string): Promise<void> {
  const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
  if (error) throw error;
}

/** Stops a not-yet-sent campaign. */
export async function cancelAdminNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .in('status', ['scheduled', 'sending']);
  if (error) throw error;
}

/** Re-opens a failed campaign so the cron sweep tries it again. */
export async function retryAdminNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ status: 'scheduled', error: null })
    .eq('id', id)
    .eq('status', 'failed');
  if (error) throw error;
}

/**
 * Sends a campaign immediately.
 *
 * Two paths, both guarded by the edge function's atomic claim so nothing can
 * double-send:
 *  1. `scheduled_at` is set to now — the pg_cron sweep will pick it up within a
 *     minute even if the direct call below fails.
 *  2. The edge function is invoked right away with the admin's JWT for a
 *     near-instant send.
 */
export async function sendNowAdminNotification(id: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({ scheduled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'scheduled');
  if (updateError) throw updateError;

  // Force a token refresh — getSession() returns cached tokens which may be expired.
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { error, data } = await supabase.functions.invoke('send-admin-notification', {
    body: { notificationId: id },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    throw new Error(
      `Could not reach the send-notification service — the cron sweep will retry shortly. (${error.message ?? 'network error'})`,
    );
  }
  if (data?.error) throw new Error(data.error);
}

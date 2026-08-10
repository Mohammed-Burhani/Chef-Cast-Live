/**
 * User Notifications API — the in-app notification center.
 *
 * Reads the current user's `notification_deliveries` (the personalized copy of
 * admin-scheduled notifications, written by the `send-admin-notification` edge
 * function) and manages their read state. RLS scopes every query to the
 * signed-in user.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DeliveryRow = Database['public']['Tables']['notification_deliveries']['Row'];

// ============================================================================
// FETCHERS
// ============================================================================

/** The current user's notifications, newest first. */
export async function fetchMyNotifications(): Promise<DeliveryRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as DeliveryRow[];
}

/** How many of the current user's notifications are unread. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notification_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notification_deliveries')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_read', false);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notification_deliveries')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);
  if (error) throw error;
}

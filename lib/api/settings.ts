/**
 * App settings API — the persisted key/value store that backs the Admin
 * Settings page, plus the live system diagnostics shown there.
 *
 * Settings are real rows in `app_settings` and actually change behavior:
 *   - auto_publish_episodes  gates the `auto_live_episodes()` pg_cron job
 *   - notify_on_episode_live gates the `notify_episode_live_webhook()` trigger
 *   - allow_dish_photos      gates dish-photo posting (community store)
 *   - allow_comments         gates post comments (community store)
 *   - app_display_name       brand shown in the admin sidebar
 *   - support_email          support contact the admin configures
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type AppSettingRow = Database['public']['Tables']['app_settings']['Row'];

// The settings surfaced in the UI, with their runtime JS value types.
export type AppSettings = {
  app_display_name: string;
  support_email: string;
  auto_publish_episodes: boolean;
  notify_on_episode_live: boolean;
  allow_dish_photos: boolean;
  allow_comments: boolean;
};

const DEFAULTS: AppSettings = {
  app_display_name: 'Foodilicious Live',
  support_email: '',
  auto_publish_episodes: true,
  notify_on_episode_live: true,
  allow_dish_photos: true,
  allow_comments: true,
};

/** Merge raw rows over the defaults, coercing jsonb values to their JS type. */
export function normalizeAppSettings(rows: AppSettingRow[]): AppSettings {
  const out = { ...DEFAULTS };
  for (const row of rows) {
    const key = row.key as keyof AppSettings;
    if (key === 'app_display_name' || key === 'support_email') {
      out[key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    } else if (
      key === 'auto_publish_episodes' ||
      key === 'notify_on_episode_live' ||
      key === 'allow_dish_photos' ||
      key === 'allow_comments'
    ) {
      out[key] = row.value === true;
    }
  }
  return out;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw error;
  return normalizeAppSettings((data ?? []) as AppSettingRow[]);
}

/** Upsert one setting (admin-only RLS). */
export async function updateAppSetting(key: keyof AppSettings, value: string | boolean) {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select('key, value')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Read a single boolean setting with a fail-open default. Used by the
 * community store to gate posting — a settings lookup error must never
 * silently block a user, so any failure returns the fallback (allow).
 */
export async function fetchSettingBool(key: keyof AppSettings, fallback = true): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback;
    return data.value === true;
  } catch {
    return fallback;
  }
}

// ============================================================================
// SYSTEM DIAGNOSTICS
// ============================================================================

export type CronJobStatus = {
  jobname: string;
  schedule: string;
  command: string;
};

export async function fetchCronStatus(): Promise<CronJobStatus[]> {
  const { data, error } = await supabase.rpc('get_cron_status');
  if (error) throw error;
  return (data ?? []) as CronJobStatus[];
}

export type SystemSnapshot = {
  dbConnected: boolean;
  dbError?: string;
  counts: {
    users: number;
    episodes: number;
    recipes: number;
    pushTokens: number;
  };
};

/** Live DB ping + row counts for the System section. Never throws. */
export async function fetchSystemSnapshot(): Promise<SystemSnapshot> {
  const countTable = async (table: string) => {
    const { count, error } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  };

  try {
    const [users, episodes, recipes, pushTokens] = await Promise.all([
      countTable('profiles'),
      countTable('episodes'),
      countTable('recipes'),
      countTable('push_tokens'),
    ]);
    return { dbConnected: true, counts: { users, episodes, recipes, pushTokens } };
  } catch (err) {
    return {
      dbConnected: false,
      dbError: err instanceof Error ? err.message : String(err),
      counts: { users: 0, episodes: 0, recipes: 0, pushTokens: 0 },
    };
  }
}

// ============================================================================
// DATA EXPORT
// ============================================================================

/** Pull a snapshot of the core tables and return it as formatted JSON. */
export async function exportAdminData(): Promise<string> {
  const fetchTable = async (table: string, limit: number) => {
    const { data, error } = await supabase.from(table as any).select('*').limit(limit);
    if (error) throw error;
    return data ?? [];
  };

  const [users, episodes, questions, answers, recipes, announcements, campaigns] = await Promise.all([
    fetchTable('profiles', 500),
    fetchTable('episodes', 500),
    fetchTable('questions', 1000),
    fetchTable('answers', 2000),
    fetchTable('recipes', 500),
    fetchTable('announcements', 500),
    fetchTable('admin_notifications', 500),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      users,
      episodes,
      questions,
      answers,
      recipes,
      announcements,
      adminNotifications: campaigns,
    },
    null,
    2,
  );
}

/** Trigger a browser download on web. Native returns false (caller shows JSON). */
export function downloadJsonFile(filename: string, content: string): boolean {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

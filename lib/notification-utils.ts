/**
 * Pure, environment-agnostic helpers for push notification payloads.
 *
 * Kept free of expo/react-native imports so they can be unit-tested directly
 * (`tests/push/notifications-client.test.ts`) without loading native modules.
 * `lib/notifications.ts` re-exports these with the same public names.
 */

export type PushPlatform = 'ios' | 'android' | 'web';

/** Payload attached to the "episode is live" push (also delivered to the web SW). */
export interface EpisodeLiveNotificationData {
  type: 'episode-live';
  episodeId: string;
  episodeTitle?: string;
  /** Relative URL used by the web service worker to open the episode. */
  url?: string;
}

/**
 * Extracts the episode id from a live-notification payload — returns `null` for
 * any notification that isn't an "episode is live" alert.
 */
export function episodeIdFromLiveNotification(
  data: Partial<EpisodeLiveNotificationData> | null | undefined,
): string | null {
  if (!data || data.type !== 'episode-live') return null;
  if (typeof data.episodeId !== 'string' || !data.episodeId) return null;
  return data.episodeId;
}

/** The `push_tokens.platform` label for a given runtime platform name. */
export function pushPlatformFor(platformOs: string): PushPlatform {
  if (platformOs === 'android') return 'android';
  if (platformOs === 'web') return 'web';
  return 'ios';
}

/** Payload attached to an admin-scheduled push (also delivered to the web SW). */
export interface AdminNotificationData {
  type: 'admin-notification';
  notificationId: string;
  /** Relative URL used to open the linked screen (e.g. /episode/<id>). */
  url?: string;
}

/**
 * Extracts the deep link from an admin-notification payload — returns `null`
 * for any notification that isn't an "admin notification" alert or that has no
 * link attached.
 */
export function urlFromAdminNotification(
  data: Partial<AdminNotificationData> | null | undefined,
): string | null {
  if (!data || data.type !== 'admin-notification') return null;
  if (typeof data.url === 'string' && data.url.trim()) return data.url.trim();
  return null;
}

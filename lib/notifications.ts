/**
 * Foodilicious — Push notifications
 *
 * Everything notification-related lives here:
 *  - Foreground display behaviour (setNotificationHandler)
 *  - Permissions + Expo push token acquisition (Android / iOS / web)
 *  - Persisting / removing the token in Supabase (`push_tokens`) keyed to the user
 *  - Reading the episode id out of a tapped notification payload
 *
 * Remote pushes are sent by the `notify-episode-live` edge function through the
 * Expo Push service, so they arrive even when the app is fully closed. See
 * `docs/PUSH_NOTIFICATIONS.md` for the full end-to-end flow.
 *
 * ── IMPORTANT — why expo-notifications is loaded lazily ─────────────────────
 * Since SDK 53, Expo Go removed Android remote push, and `expo-notifications`
 * *throws* when used there. Worse, the package runs a module-level side effect
 * at IMPORT time (`DevicePushTokenAutoRegistration.fx` → `addPushTokenListener`
 * → `warnOfExpoGoPushUsage`) that throws on Android in Expo Go — so even a
 * plain static `import * as Notifications from 'expo-notifications'` crashes the
 * app before any of our code runs.
 *
 * Therefore this module never statically imports `expo-notifications`. It is
 * loaded lazily via `import()`, and every entry point no-ops in Expo Go BEFORE
 * the module is ever loaded. Push still works in development / production
 * builds (built with `expo run:android` / EAS).
 */

import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  episodeIdFromLiveNotification,
  pushPlatformFor,
  type EpisodeLiveNotificationData,
  type PushPlatform,
} from './notification-utils';

// Type-only import — erased at build time, so it never loads the package.
import type * as Notifications from 'expo-notifications';

/**
 * `true` when running inside Expo Go — where push must be a complete no-op.
 *
 * Evaluated lazily (not once at import) so each call reflects the current
 * runtime: the environment never changes mid-session, and it keeps test files
 * that mock `isRunningInExpoGo` independently from leaking through the module
 * cache when `bun test` runs them in one process.
 */
export function isExpoGo(): boolean {
  return isRunningInExpoGo();
}

let notificationsModule: Promise<typeof import('expo-notifications')> | null = null;

/**
 * Lazily loads `expo-notifications`. Only ever called from behind the `isExpoGo`
 * guard, so the package (and its throw-on-import side effect) is never loaded
 * inside Expo Go.
 */
function loadNotifications(): Promise<typeof import('expo-notifications')> {
  notificationsModule ??= import('expo-notifications');
  return notificationsModule;
}

// Re-exported from notification-utils.ts so existing importers keep working.
export type { PushPlatform, EpisodeLiveNotificationData } from './notification-utils';

/** The EAS project id, used by Expo's servers to mint a push token. */
const PROJECT_ID =
  Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

/**
 * Sets the foreground notification handler (banner + list row + sound while the
 * app is open). Must run once at startup, before the app can receive any
 * notification. No-op in Expo Go.
 */
export async function initNotifications(): Promise<void> {
  if (isExpoGo()) return;

  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ensures the Android "default" notification channel exists.
 * Safe to call more than once — on iOS / web it is a no-op.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isExpoGo()) return;

  const Notifications = await loadNotifications();
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

/**
 * Requests permission and returns the Expo push token for this device, or `null`
 * when the user declines (or web push isn't configured yet).
 *
 * Never throws — the app must keep working whether or not the user opts in.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Remote push can't be acquired in Expo Go (SDK 53+) — skip cleanly.
  if (isExpoGo()) {
    if (__DEV__) {
      console.warn('[notifications] Push registration skipped: not supported in Expo Go. Use a development build to test push notifications.');
    }
    return null;
  }

  try {
    const Notifications = await loadNotifications();
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (!PROJECT_ID) {
      console.warn('[notifications] No EAS projectId found — push token not created.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return token.data;
  } catch (err) {
    // Web push requires `notification.vapidPublicKey` + a service worker in app.json.
    // Until those are configured (see docs/PUSH_NOTIFICATIONS.md) registration simply
    // no-ops on web instead of breaking the app.
    if (__DEV__) {
      console.warn('[notifications] Push registration skipped:', err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/**
 * Wires up the "notification tapped → open episode" listener. Resolves to a
 * subscription, or `null` in Expo Go (where remote notifications can't arrive).
 */
export async function addNotificationResponseListener(
  handler: (notification: Notifications.Notification) => void
): Promise<{ remove(): void } | null> {
  if (isExpoGo()) return null;

  const Notifications = await loadNotifications();
  return Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification);
  });
}

/**
 * Returns the notification the app was cold-started by, or `null` when there is
 * none (and always in Expo Go).
 */
export async function getLastNotificationResponse(): Promise<Notifications.Notification | null> {
  if (isExpoGo()) return null;

  const Notifications = await loadNotifications();
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification ?? null;
}

/**
 * Stores the device's push token so the server can send live alerts to this user.
 * Idempotent — upserts on the unique `token` column.
 */
export async function savePushToken(
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  if (!token) return;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'token' }
    );

  if (error) {
    console.warn('[notifications] Failed to store push token:', error.message);
  }
}

/**
 * Removes the device's push token from the server (used on sign-out).
 */
export async function removePushToken(token?: string | null): Promise<void> {
  if (!token) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token);

  if (error) {
    console.warn('[notifications] Failed to remove push token:', error.message);
  }
}

/**
 * Extracts the episode id from a notification payload — returns `null` for any
 * notification that isn't an "episode is live" alert.
 */
export function getEpisodeIdFromNotification(
  notification: Notifications.Notification
): string | null {
  return episodeIdFromLiveNotification(
    notification.request.content.data as Partial<EpisodeLiveNotificationData> | undefined,
  );
}

/**
 * The platform label stored in `push_tokens.platform`.
 */
export function currentPushPlatform(): PushPlatform {
  return pushPlatformFor(Platform.OS);
}

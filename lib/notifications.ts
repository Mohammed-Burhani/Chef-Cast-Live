/**
 * ChefCast: Live — Push notifications
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
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Foreground behaviour: show a banner + list row + sound while the app is open.
 * This must be set before the app can receive any notification.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPlatform = 'ios' | 'android' | 'web';

/** The EAS project id, used by Expo's servers to mint a push token. */
const PROJECT_ID =
  Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

/**
 * Ensures the Android "default" notification channel exists.
 * Safe to call more than once — on iOS / web it is a no-op.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
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
  try {
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

/** Payload attached to the "episode is live" push. */
export interface EpisodeLiveNotificationData {
  type: 'episode-live';
  episodeId: string;
  episodeTitle?: string;
  /** Relative URL used by the web service worker to open the episode. */
  url?: string;
}

/**
 * Extracts the episode id from a notification payload — returns `null` for any
 * notification that isn't an "episode is live" alert.
 */
export function getEpisodeIdFromNotification(
  notification: Notifications.Notification
): string | null {
  const data = notification.request.content.data as
    | Partial<EpisodeLiveNotificationData>
    | undefined;

  if (!data || data.type !== 'episode-live') return null;
  if (typeof data.episodeId !== 'string' || !data.episodeId) return null;
  return data.episodeId;
}

/**
 * The platform label stored in `push_tokens.platform`.
 */
export function currentPushPlatform(): PushPlatform {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'ios';
}

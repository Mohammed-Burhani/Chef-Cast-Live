/**
 * PushNotificationsProvider
 *
 * Mounted once at the root of the app. Owns the device-side push notification
 * lifecycle:
 *  - Registers this device's Expo push token whenever a user signs in, and
 *    stores it in Supabase so the server can reach this user.
 *  - Removes the token when the user signs out.
 *  - Routes to the episode screen when an "episode is live" notification is
 *    tapped (both while the app is running and on cold start).
 *
 * Web note: display + click handling is done by the service worker
 * (`public/expo-service-worker.js`); the token is still registered here.
 */

import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ReactNode, useEffect, useRef } from 'react';

import {
  currentPushPlatform,
  getEpisodeIdFromNotification,
  registerForPushNotificationsAsync,
  removePushToken,
  savePushToken,
} from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // Token registered for this device, so it can be removed on sign-out.
  const pushTokenRef = useRef<string | null>(null);
  // Episode we still need to open (set on tap / cold start, waits for auth).
  const pendingEpisodeIdRef = useRef<string | null>(null);

  // ── 1) Register / unregister the device token with the current user ────────
  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const sync = async () => {
      if (!isLoggedIn || !user) {
        await removePushToken(pushTokenRef.current);
        pushTokenRef.current = null;
        return;
      }

      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) return;

      pushTokenRef.current = token;
      await savePushToken(user.id, token, currentPushPlatform());
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user, loading]);

  // ── 2) Notification tap → open the episode (app already running) ──────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const episodeId = getEpisodeIdFromNotification(response.notification);
        if (episodeId) pendingEpisodeIdRef.current = episodeId;
      }
    );

    return () => subscription.remove();
  }, []);

  // ── 3) Cold start: app opened by tapping a notification ───────────────────
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const episodeId = getEpisodeIdFromNotification(response.notification);
        if (episodeId) pendingEpisodeIdRef.current = episodeId;
      })
      .catch(() => {
        // Not supported on every platform — safe to ignore.
      });
  }, []);

  // ── 4) Navigate once auth is ready ────────────────────────────────────────
  useEffect(() => {
    if (loading || !isLoggedIn) return;

    const episodeId = pendingEpisodeIdRef.current;
    if (!episodeId) return;

    pendingEpisodeIdRef.current = null;
    router.push(`/episode/${episodeId}` as never);
  }, [loading, isLoggedIn, router]);

  return <>{children}</>;
}

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
 *
 * Expo Go note: the underlying `expo-notifications` package throws on import on
 * Android inside Expo Go (SDK 53+), so every call here goes through the lazy
 * helpers in `lib/notifications.ts` and is skipped entirely when `isExpoGo` is
 * true — the app must keep running normally in Expo Go, push just won't work.
 */

import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useRef } from 'react';

import {
  addNotificationResponseListener,
  currentPushPlatform,
  getEpisodeIdFromNotification,
  getLastNotificationResponse,
  getUrlFromNotification,
  initNotifications,
  isExpoGo,
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
  // Deep link from an admin-scheduled notification (e.g. /episode/<id>).
  const pendingUrlRef = useRef<string | null>(null);

  // ── 0) Set the foreground notification handler once at startup ────────────
  useEffect(() => {
    initNotifications();
  }, []);

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
    // No remote notifications arrive in Expo Go — skip the native listeners.
    if (isExpoGo()) return;

    let cancelled = false;
    let subscription: { remove(): void } | null = null;

    addNotificationResponseListener((notification) => {
      const episodeId = getEpisodeIdFromNotification(notification);
      if (episodeId) {
        pendingEpisodeIdRef.current = episodeId;
      } else {
        const url = getUrlFromNotification(notification);
        if (url) pendingUrlRef.current = url;
      }
    }).then((sub) => {
      if (cancelled) {
        sub?.remove();
      } else {
        subscription = sub;
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // ── 3) Cold start: app opened by tapping a notification ───────────────────
  useEffect(() => {
    if (isExpoGo()) return;

    let cancelled = false;

    getLastNotificationResponse()
      .then((notification) => {
        if (cancelled || !notification) return;
        const episodeId = getEpisodeIdFromNotification(notification);
        if (episodeId) {
          pendingEpisodeIdRef.current = episodeId;
        } else {
          const url = getUrlFromNotification(notification);
          if (url) pendingUrlRef.current = url;
        }
      })
      .catch(() => {
        // Not supported on every platform — safe to ignore.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 4) Navigate once auth is ready ────────────────────────────────────────
  useEffect(() => {
    if (loading || !isLoggedIn) return;

    const episodeId = pendingEpisodeIdRef.current;
    const url = pendingUrlRef.current;
    if (!episodeId && !url) return;

    pendingEpisodeIdRef.current = null;
    pendingUrlRef.current = null;

    if (episodeId) {
      router.push(`/episode/${episodeId}` as never);
    } else {
      router.push(url as never);
    }
  }, [loading, isLoggedIn, router]);

  return <>{children}</>;
}

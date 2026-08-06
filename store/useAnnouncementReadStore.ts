/**
 * Announcement read-state store.
 *
 * Tracks when the user last opened the notifications drawer so the home-screen
 * bell can show an unread count — computed entirely client-side and persisted
 * to AsyncStorage. No backend dependency: the badge clears the moment the
 * drawer is opened, and any announcement published after that point counts as
 * new again.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { create } from "zustand";

const STORAGE_KEY = "@foodilicious:announcements-seen-at";

interface AnnouncementReadState {
  /** ISO timestamp of when the user last opened the notifications drawer */
  lastSeenAt: string | null;
  /** True once AsyncStorage has been read (prevents a badge flash before load) */
  loaded: boolean;
  loadFromStorage: () => Promise<void>;
  markAllSeen: () => Promise<void>;
}

export const useAnnouncementReadStore = create<AnnouncementReadState>()((set) => ({
  lastSeenAt: null,
  loaded: false,

  loadFromStorage: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      set({ lastSeenAt: value ?? null, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  markAllSeen: async () => {
    const now = new Date().toISOString();
    set({ lastSeenAt: now });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, now);
    } catch {
      // Non-fatal — the in-memory value still clears the badge for this session.
    }
  },
}));

/**
 * Number of published announcements newer than the user's last drawer open.
 * Returns 0 until the persisted value is loaded, so the badge never flashes
 * a wrong count on first render.
 */
export function useUnseenAnnouncementCount(announcements: { created_at: string }[]): number {
  const lastSeenAt = useAnnouncementReadStore((s) => s.lastSeenAt);
  const loaded = useAnnouncementReadStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) {
      useAnnouncementReadStore.getState().loadFromStorage();
    }
  }, [loaded]);

  if (!loaded) return 0;
  if (!lastSeenAt) return announcements.length;
  const lastSeenMs = new Date(lastSeenAt).getTime();
  return announcements.filter((a) => new Date(a.created_at).getTime() > lastSeenMs).length;
}

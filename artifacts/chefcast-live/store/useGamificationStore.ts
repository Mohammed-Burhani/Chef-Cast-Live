/**
 * Gamification store using Zustand.
 * Manages XP totals, badge collection, streak tracking, and XP log.
 * Persists to AsyncStorage so progress is saved between sessions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { ALL_BADGES } from "@/constants/badges";
import { XP_REWARDS } from "@/constants/gamification";
import { Badge, XPEvent } from "@/types";

interface XPLogEntry {
  id: string;
  event: XPEvent;
  amount: number;
  label: string;
  timestamp: string;
}

interface GamificationState {
  /** Total XP earned */
  xpTotal: number;
  /** Current daily streak */
  currentStreak: number;
  /** Longest streak ever recorded */
  longestStreak: number;
  /** Date of last cook session */
  lastCookedAt: string | null;
  /** All badges with lock/unlock state */
  badges: Badge[];
  /** Recent XP earning events for the XP log */
  xpLog: XPLogEntry[];
  /** Number of polls voted in (for badge tracking) */
  pollsVoted: number;
  /** Number of knife_work steps completed */
  knifeWorkSteps: number;
  /** Number of sauce steps completed */
  sauceSteps: number;

  /** Load gamification state from AsyncStorage */
  loadFromStorage: () => Promise<void>;
  /** Award XP for an event */
  awardXP: (event: XPEvent, label?: string) => Promise<void>;
  /** Unlock a badge by slug */
  unlockBadge: (slug: string) => Promise<void>;
  /** Update streak after completing a cook session */
  updateStreak: () => Promise<void>;
  /** Increment a badge progress counter */
  incrementProgress: (field: "pollsVoted" | "knifeWorkSteps" | "sauceSteps") => Promise<void>;
}

const STORAGE_KEY = "@chefcast:gamification";

const getInitialBadges = (): Badge[] =>
  ALL_BADGES.map((b, idx) => ({
    ...b,
    isUnlocked: idx < 3,
    earnedAt: idx < 3 ? new Date(Date.now() - 1000 * 60 * 60 * 24 * idx).toISOString() : undefined,
    progress: idx < 3 ? (b.maxProgress ?? 1) : Math.floor((b.maxProgress ?? 1) * 0.4),
    maxProgress: b.maxProgress ?? 1,
  }));

export const useGamificationStore = create<GamificationState>()((set, get) => ({
  xpTotal: 1250,
  currentStreak: 5,
  longestStreak: 12,
  lastCookedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  badges: getInitialBadges(),
  xpLog: [
    { id: "log-1", event: "COOK_SESSION_COMPLETED", amount: 100, label: "Completed Italian Risotto Night", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString() },
    { id: "log-2", event: "STEP_COMPLETED", amount: 5, label: "Step completed: knife work", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18 + 1000 * 60 * 5).toISOString() },
    { id: "log-3", event: "POLL_VOTED", amount: 10, label: "Voted in live poll", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { id: "log-4", event: "DISH_PHOTO_UPLOADED", amount: 25, label: "Shared dish photo", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
    { id: "log-5", event: "STREAK_3_DAYS", amount: 75, label: "3-day cooking streak bonus!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  ],
  pollsVoted: 4,
  knifeWorkSteps: 2,
  sauceSteps: 3,

  loadFromStorage: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const saved = JSON.parse(json);
        set(saved);
      }
    } catch {
      // Use default initial state
    }
  },

  awardXP: async (event, label) => {
    const amount = XP_REWARDS[event];
    const newXP = get().xpTotal + amount;
    const logEntry: XPLogEntry = {
      id: Date.now().toString(),
      event,
      amount,
      label: label ?? event.replace(/_/g, " ").toLowerCase(),
      timestamp: new Date().toISOString(),
    };
    const newLog = [logEntry, ...get().xpLog].slice(0, 50);
    set({ xpTotal: newXP, xpLog: newLog });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), xpTotal: newXP, xpLog: newLog }));
  },

  unlockBadge: async (slug) => {
    const badges = get().badges.map((b) =>
      b.slug === slug && !b.isUnlocked
        ? { ...b, isUnlocked: true, earnedAt: new Date().toISOString(), progress: b.maxProgress }
        : b
    );
    set({ badges });
    await get().awardXP("BADGE_EARNED", `Earned badge!`);
  },

  updateStreak: async () => {
    const { lastCookedAt, currentStreak, longestStreak } = get();
    const now = new Date();
    const last = lastCookedAt ? new Date(lastCookedAt) : null;
    const daysSince = last ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)) : 999;

    let newStreak = currentStreak;
    if (daysSince === 0) {
      // Already cooked today, no change
    } else if (daysSince <= 2) {
      newStreak = currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(longestStreak, newStreak);
    set({ currentStreak: newStreak, longestStreak: newLongest, lastCookedAt: now.toISOString() });
  },

  incrementProgress: async (field) => {
    const current = get()[field];
    set({ [field]: current + 1 } as Partial<GamificationState>);
  },
}));

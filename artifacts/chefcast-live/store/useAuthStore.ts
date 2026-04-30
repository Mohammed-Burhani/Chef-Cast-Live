/**
 * Authentication store using Zustand.
 * Manages the current user's login state and profile.
 * Persists auth state to AsyncStorage so users stay logged in.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { UserProfile } from "@/types";

interface AuthState {
  /** Whether the user has completed onboarding */
  isOnboarded: boolean;
  /** Whether the user is currently logged in */
  isLoggedIn: boolean;
  /** The current user's profile data */
  user: UserProfile | null;
  /** Whether we're loading initial state from AsyncStorage */
  loading: boolean;

  /** Load auth state from AsyncStorage on app start */
  loadFromStorage: () => Promise<void>;
  /** Log in with a user profile (mock — no Supabase in first build) */
  login: (user: UserProfile) => Promise<void>;
  /** Log out and clear stored credentials */
  logout: () => Promise<void>;
  /** Mark onboarding as complete */
  completeOnboarding: () => Promise<void>;
  /** Update the user's profile */
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const STORAGE_KEY_USER = "@chefcast:user";
const STORAGE_KEY_ONBOARDED = "@chefcast:onboarded";

export const useAuthStore = create<AuthState>()((set, get) => ({
  isOnboarded: false,
  isLoggedIn: false,
  user: null,
  loading: true,

  loadFromStorage: async () => {
    try {
      const [userJson, onboardedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_USER),
        AsyncStorage.getItem(STORAGE_KEY_ONBOARDED),
      ]);

      const user = userJson ? (JSON.parse(userJson) as UserProfile) : null;
      const isOnboarded = onboardedStr === "true";

      set({
        user,
        isLoggedIn: !!user,
        isOnboarded,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  login: async (user) => {
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
    set({ user: null, isLoggedIn: false });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(STORAGE_KEY_ONBOARDED, "true");
    set({ isOnboarded: true });
  },

  updateUser: async (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    set({ user: updated });
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { UserProfile } from "@/types";
import { supabase } from "@/lib/supabase";

interface AuthState {
  isOnboarded: boolean;
  isLoggedIn: boolean;
  user: UserProfile | null;
  loading: boolean;
  loadFromStorage: () => Promise<void>;
  login: (user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const STORAGE_KEY_ONBOARDED = "@foodilicious:onboarded";

export const useAuthStore = create<AuthState>()((set, get) => ({
  isOnboarded: false,
  isLoggedIn: false,
  user: null,
  loading: true,

  loadFromStorage: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ loading: false, isLoggedIn: false, user: null });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          username: session.user.email?.split('@')[0] || `user_${session.user.id.slice(0, 8)}`,
          xp: 0,
        });
        
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (newProfile) {
          set({ 
            user: mapProfile(newProfile, session.user.email), 
            isLoggedIn: true, 
            loading: false 
          });
        } else {
          set({ loading: false, isLoggedIn: false });
        }
        return;
      }

      const onboardedStr = await AsyncStorage.getItem(STORAGE_KEY_ONBOARDED);
      const isOnboarded = onboardedStr === "true" || !!profile.onboarded_at;

      set({
        user: mapProfile(profile, session.user.email),
        isLoggedIn: true,
        isOnboarded,
        loading: false,
      });
    } catch (err) {
      console.error('[Auth] Load error:', err);
      set({ loading: false, isLoggedIn: false, user: null });
    }
  },

  login: async (user) => {
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(STORAGE_KEY_ONBOARDED);
    set({ user: null, isLoggedIn: false, isOnboarded: false });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(STORAGE_KEY_ONBOARDED, "true");
    set({ isOnboarded: true });
  },

  updateUser: async (updates) => {
    const current = get().user;
    if (!current) return;
    
    const updated = { ...current, ...updates };
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updated.username,
        avatar_url: updated.avatar,
        xp: updated.xpTotal,
      })
      .eq('id', current.id);

    if (!error) {
      set({ user: updated });
    }
  },
}));

function mapProfile(profile: any, email: string | undefined): UserProfile {
  return {
    id: profile.id,
    email: email || '',
    username: profile.username,
    avatar: profile.avatar_url,
    xpTotal: profile.xp || 0,
    currentStreak: 0,
    longestStreak: 0,
    role: profile.is_admin ? 'admin' : 'viewer',
    isBanned: profile.is_banned ?? false,
    createdAt: profile.created_at,
  };
}

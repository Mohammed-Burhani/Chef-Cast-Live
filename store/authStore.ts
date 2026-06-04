/**
 * Supabase Authentication Store
 * Manages session, user, and profile state with auto-sync
 */

import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  syncProfile: (user: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  initialize: async () => {
    try {
      // Restore session from AsyncStorage
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ session, user: session.user });
        await get().syncProfile(session.user);
      }

      // Subscribe to auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth]', event, session?.user?.email);

        set({ session, user: session?.user ?? null });

        if (event === 'SIGNED_IN' && session?.user) {
          await get().syncProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          set({ profile: null });
        }
      });

      set({ isLoading: false });
    } catch (error) {
      console.error('[Auth] Initialize error:', error);
      set({ isLoading: false });
    }
  },

  // Internal: sync profile from DB or create if missing
  syncProfile: async (user: User) => {
    try {
      // Check if profile exists
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existing) {
        set({ profile: existing });
        return;
      }

      // Profile doesn't exist, create it
      if (fetchError?.code === 'PGRST116') {
        // Generate username: email prefix or random for anon users
        const username = user.email 
          ? user.email.split('@')[0] 
          : `guest_${Math.random().toString(36).slice(2, 8)}`;
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username,
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Auth] Profile creation error:', insertError);
          return;
        }

        set({ profile: newProfile });
      }
    } catch (error) {
      console.error('[Auth] Profile sync error:', error);
    }
  },
}));

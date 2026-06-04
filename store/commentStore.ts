/**
 * Comment Store
 * Manages live episode comments with Realtime sync
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: string;
}

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  isSending: boolean;
  sendError: string | null;

  loadComments: (episodeId: string) => Promise<void>;
  appendComment: (comment: Comment) => void;
  sendComment: (episodeId: string, text: string) => Promise<void>;
  reset: () => void;
}

const MAX_COMMENTS = 200;
const TRIM_TO = 150;

export const useCommentStore = create<CommentState>()((set, get) => ({
  comments: [],
  isLoading: false,
  isSending: false,
  sendError: null,

  loadComments: async (episodeId: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          episode_id,
          user_id,
          text,
          created_at,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('episode_id', episodeId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const comments: Comment[] = (data || []).map((row: any) => ({
        id: row.id,
        episodeId: row.episode_id,
        userId: row.user_id,
        username: row.profiles?.username ?? 'Unknown',
        avatarUrl: row.profiles?.avatar_url ?? null,
        text: row.text,
        createdAt: row.created_at,
      }));

      set({ comments, isLoading: false });
    } catch (error) {
      console.error('[Comments] Load error:', error);
      set({ isLoading: false });
    }
  },

  appendComment: (comment: Comment) => {
    const state = get();
    let newComments = [...state.comments, comment];

    // Trim if over limit
    if (newComments.length > MAX_COMMENTS) {
      newComments = newComments.slice(newComments.length - TRIM_TO);
    }

    set({ comments: newComments });
  },

  sendComment: async (episodeId: string, text: string) => {
    const trimmed = text.trim();

    // Validation
    if (!trimmed) return;
    if (trimmed.length > 200) {
      set({ sendError: 'Comment too long (max 200 characters)' });
      setTimeout(() => set({ sendError: null }), 3000);
      return;
    }

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ sendError: 'You must be logged in to comment' });
      setTimeout(() => set({ sendError: null }), 3000);
      return;
    }

    set({ isSending: true, sendError: null });

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          episode_id: episodeId,
          user_id: userId,
          text: trimmed,
        });

      if (error) throw error;

      set({ isSending: false });
    } catch (error: any) {
      console.error('[Comments] Send error:', error);
      set({
        sendError: 'Failed to send comment',
        isSending: false,
      });
      setTimeout(() => set({ sendError: null }), 3000);
    }
  },

  reset: () => {
    set({
      comments: [],
      isLoading: false,
      isSending: false,
      sendError: null,
    });
  },
}));

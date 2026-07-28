/**
 * ============================================================================
 * LIVE COMMENT STORE
 * ============================================================================
 * Real-time comment system using Supabase Realtime Broadcast for
 * sub-millisecond delivery. Designed to handle 10,000+ concurrent commenters.
 *
 * Architecture:
 *   - New comments are sent via the post-comment edge function
 *   - Edge function validates, rate-limits, and inserts into DB
 *   - Edge function broadcasts the comment via Supabase Realtime Broadcast
 *   - All connected clients receive the broadcast in < 50ms
 *   - Database is only used for persistence/history, NOT real-time delivery
 *
 * Why Broadcast instead of postgres_changes?
 *   - Broadcast bypasses the database entirely for delivery
 *   - No WAL bloat from high comment volume
 *   - No database connection pool exhaustion
 *   - Sub-millisecond latency (direct WebSocket push)
 *   - Supabase can handle millions of broadcast messages
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { channelManager } from '@/lib/realtime/channelManager';
import type { CommentEvent } from '@/lib/realtime/types';

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
  rateLimitRetryAfter: number | null;
  commentSubscriptionActive: boolean;

  loadComments: (episodeId: string) => Promise<void>;
  appendComment: (comment: Comment) => void;
  sendComment: (episodeId: string, text: string) => Promise<void>;
  subscribeToComments: (episodeId: string) => void;
  unsubscribeFromComments: (episodeId: string) => void;
  reset: () => void;
}

// Keep last N comments in memory for the live feed
const MAX_COMMENTS = 200;
const TRIM_TO = 150;

// Suppress duplicate comments (optimistic + broadcast)
const recentCommentIds = new Set<string>();
const RECENT_IDS_MAX = 500;

function trackRecentId(id: string) {
  recentCommentIds.add(id);
  if (recentCommentIds.size > RECENT_IDS_MAX) {
    const iterator = recentCommentIds.values();
    for (let i = 0; i < 100; i++) {
      const val = iterator.next().value;
      if (val) recentCommentIds.delete(val);
    }
  }
}

function isRecentId(id: string): boolean {
  return recentCommentIds.has(id);
}

export const useCommentStore = create<CommentState>()((set, get) => ({
  comments: [],
  isLoading: false,
  isSending: false,
  sendError: null,
  rateLimitRetryAfter: null,
  commentSubscriptionActive: false,

  /**
   * Load comment history from the database
   * Called once when the comments tab is first shown
   */
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

      const comments: Comment[] = (data || []).map((row: any) => {
        const id = row.id;
        trackRecentId(id);
        return {
          id,
          episodeId: row.episode_id,
          userId: row.user_id,
          username: row.profiles?.username ?? 'Unknown',
          avatarUrl: row.profiles?.avatar_url ?? null,
          text: row.text,
          createdAt: row.created_at,
        };
      });

      set({ comments, isLoading: false });
    } catch (error) {
      console.error('[Comments] Load error:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Add a comment to the local state
   * Used for both incoming broadcast comments and optimistic local adds
   */
  appendComment: (comment: Comment) => {
    // Dedup: skip if we've already seen this comment ID
    if (isRecentId(comment.id)) return;
    trackRecentId(comment.id);

    const state = get();
    let newComments = [...state.comments, comment];

    // Trim if over limit
    if (newComments.length > MAX_COMMENTS) {
      newComments = newComments.slice(newComments.length - TRIM_TO);
    }

    set({ comments: newComments });
  },

  /**
   * Send a comment via the post-comment edge function
   * The edge function handles:
   *   - Rate limiting (5 comments per 10 seconds)
   *   - Input validation
   *   - Database insertion
   *   - Broadcasting to all connected clients
   */
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

    set({ isSending: true, sendError: null, rateLimitRetryAfter: null });

    try {
      // Get the session for the Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No auth token');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/post-comment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
          },
          body: JSON.stringify({ episodeId, text: trimmed }),
        }
      );

      const result = await response.json();

      if (response.status === 429) {
        // Rate limited
        const retryAfter = result.retryAfterSeconds || 10;
        set({
          sendError: `Too many comments. Wait ${retryAfter}s.`,
          isSending: false,
          rateLimitRetryAfter: retryAfter,
        });

        // Auto-clear retry message
        setTimeout(() => set({ sendError: null, rateLimitRetryAfter: null }), retryAfter * 1000);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send comment');
      }

      // Optimistic: immediately add the comment to local state
      // The broadcast will be deduped via the recentCommentIds set
      const newComment: Comment = {
        id: result.commentId || `temp-${Date.now()}`,
        episodeId,
        userId,
        username: useAuthStore.getState().profile?.username || 'You',
        avatarUrl: null,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      get().appendComment(newComment);
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

  /**
   * Subscribe to broadcast comments for an episode
   * This connects to the Supabase Realtime Broadcast channel
   * and listens for new_comment events
   */
  subscribeToComments: (episodeId: string) => {
    const state = get();
    if (state.commentSubscriptionActive) return;

    // Subscribe to the comments channel via the channel manager
    channelManager.subscribeToComments(episodeId);

    // Register event handler for incoming comments
    channelManager.on('NEW_COMMENT', (event: CommentEvent) => {
      if (event.episodeId !== episodeId) return;

      // Skip if we already have this comment (optimistic add or DB load)
      if (isRecentId(event.commentId)) return;

      const comment: Comment = {
        id: event.commentId,
        episodeId: event.episodeId,
        userId: event.userId,
        username: event.username,
        avatarUrl: event.avatarUrl,
        text: event.text,
        createdAt: event.createdAt,
      };

      get().appendComment(comment);
    });

    set({ commentSubscriptionActive: true });
  },

  /**
   * Unsubscribe from comments for an episode
   */
  unsubscribeFromComments: (episodeId: string) => {
    channelManager.unsubscribeFromComments(episodeId);
    set({ commentSubscriptionActive: false });
  },

  /**
   * Reset store state
   */
  reset: () => {
    set({
      comments: [],
      isLoading: false,
      isSending: false,
      sendError: null,
      rateLimitRetryAfter: null,
      commentSubscriptionActive: false,
    });
  },
}));

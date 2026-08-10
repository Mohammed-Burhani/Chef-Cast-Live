/**
 * ============================================================================
 * COMMUNITY STORE
 * ============================================================================
 * Posts + comments are backed by Supabase (real data + realtime).
 *
 *   - Posts      : dish_photos rows (profiles + comment count + liked state)
 *   - Comments   : post_comments via lib/api/comments (RPCs + postgres_changes)
 *   - Stories    : prototype/mock (community module not built yet)
 *   - Follows    : prototype/mock (community module not built yet)
 *
 * Realtime: subscribeToComments() opens a postgres_changes channel filtered to
 * the open post's id; new INSERT events refresh the comment list in place so an
 * open CommentsSheet updates live without a manual reload.
 */

import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CommunityPost, Comment, Story } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import * as commentApi from '@/lib/api/comments';
import { uploadDishPhoto, toggleLikeDishPhoto, uploadLocalDishPhoto } from '@/lib/api/supabase';
import { fetchSettingBool } from '@/lib/api/settings';

interface CommunityState {
  // Posts
  posts: CommunityPost[];
  isLoadingPosts: boolean;

  // Comments
  comments: Comment[];
  isLoadingComments: boolean;

  // Stories
  stories: Story[];
  isLoadingStories: boolean;

  // Follows
  following: string[];
  followers: string[];

  // Actions
  loadPosts: (filter?: 'all' | 'following') => Promise<void>;
  createPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'isLiked' | 'comments' | 'shares' | 'createdAt'>) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;

  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  toggleLikeComment: (commentId: string) => Promise<void>;
  subscribeToComments: (postId: string) => void;
  unsubscribeFromComments: () => void;

  loadStories: () => Promise<void>;
  createStory: (story: Omit<Story, 'id' | 'viewers' | 'isViewed' | 'createdAt'>) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;

  toggleFollow: (userId: string) => Promise<void>;
  loadUserRelations: (userId: string) => Promise<void>;

  reset: () => void;
}

// Mock stories for prototype (community module not built yet)
const MOCK_STORIES: Story[] = [
  {
    id: 'story-1',
    userId: 'user-1',
    username: 'chef_marco',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
    mediaType: 'image',
    caption: 'Behind the scenes at the restaurant today! 🎬',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
    viewers: ['user-2', 'user-3'],
    isViewed: false,
  },
  {
    id: 'story-2',
    userId: 'user-2',
    username: 'foodie_sara',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
    mediaType: 'image',
    caption: 'Cooking up something special! Stay tuned 👀',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23.5).toISOString(),
    viewers: [],
    isViewed: false,
  },
  {
    id: 'story-3',
    userId: 'user-4',
    username: 'baking_queen',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800',
    mediaType: 'image',
    caption: 'Fresh bread day! 🍞✨',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
    viewers: ['user-1', 'user-2', 'user-3'],
    isViewed: true,
  },
];

// Single live channel for the currently open comment sheet.
let commentsChannel: RealtimeChannel | null = null;

/** Silently re-fetch comments (used by realtime) without toggling the loader. */
async function refreshComments(postId: string) {
  try {
    const rows = await commentApi.fetchPostComments(postId);
    const comments: Comment[] = rows.map(mapCommentRow);
    useCommunityStore.setState({ comments });
  } catch (error) {
    console.error('[Community] Refresh comments error:', error);
  }
}

function mapCommentRow(row: commentApi.PostCommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? undefined,
    text: row.text,
    likes: row.like_count,
    isLiked: row.is_liked,
    createdAt: row.created_at,
  };
}

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  // Initial state
  posts: [],
  isLoadingPosts: false,
  comments: [],
  isLoadingComments: false,
  stories: MOCK_STORIES,
  isLoadingStories: false,
  following: ['user-1', 'user-2', 'user-4'],
  followers: ['user-2', 'user-3', 'user-5'],

  // Posts
  loadPosts: async (filter = 'all') => {
    set({ isLoadingPosts: true });
    try {
      const userId = useAuthStore.getState().user?.id;

      const { data, error } = await supabase
        .from('dish_photos')
        .select(`
          id,
          user_id,
          image_url,
          caption,
          like_count,
          created_at,
          profiles:user_id ( username, avatar_url ),
          post_comments ( id ),
          dish_photo_likes ( user_id )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let posts: CommunityPost[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        username: row.profiles?.username ?? 'Unknown',
        avatarUrl: row.profiles?.avatar_url ?? undefined,
        photoUrl: row.image_url,
        caption: row.caption ?? '',
        likes: row.like_count ?? 0,
        isLiked: !!(row.dish_photo_likes ?? []).some((like: any) => like.user_id === userId),
        comments: (row.post_comments ?? []).length,
        shares: 0,
        createdAt: row.created_at,
      }));

      if (filter === 'following') {
        const following = get().following;
        posts = posts.filter((post) => following.includes(post.userId));
      }

      set({ posts, isLoadingPosts: false });
    } catch (error) {
      console.error('[Community] Load posts error:', error);
      set({ isLoadingPosts: false });
    }
  },

  createPost: async (postData) => {
    // Admin can disable dish-photo posting app-wide via Settings → Community.
    if (!(await fetchSettingBool('allow_dish_photos'))) {
      throw new Error('Posting is currently disabled by the admin.');
    }

    const imageUrl = await ensureStoredImageUrl(postData.photoUrl);
    await uploadDishPhoto({ imageUrl, caption: postData.caption });
    await get().loadPosts('all');
  },

  toggleLike: async (postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const nextLiked = !post.isLiked;
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: nextLiked, likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)) }
          : p
      ),
    }));

    try {
      await toggleLikeDishPhoto(postId);
    } catch (error) {
      console.error('[Community] Toggle like error:', error);
      // Revert on failure
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: !nextLiked, likes: Math.max(0, p.likes + (nextLiked ? -1 : 1)) }
            : p
        ),
      }));
    }
  },

  toggleSave: async (postId: string) => {
    try {
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, isSaved: !post.isSaved } : post
        ),
      }));
    } catch (error) {
      console.error('[Community] Toggle save error:', error);
    }
  },

  // Comments
  loadComments: async (postId: string) => {
    set({ isLoadingComments: true });
    try {
      const rows = await commentApi.fetchPostComments(postId);
      set({ comments: rows.map(mapCommentRow), isLoadingComments: false });
    } catch (error) {
      console.error('[Community] Load comments error:', error);
      set({ isLoadingComments: false });
    }
  },

  addComment: async (postId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Admin can disable comments app-wide via Settings → Community.
    if (!(await fetchSettingBool('allow_comments'))) {
      throw new Error('Comments are currently disabled by the admin.');
    }

    try {
      const row = await commentApi.addPostComment(postId, trimmed);
      const me = useAuthStore.getState().user;

      const comment: Comment = {
        id: row.id,
        postId,
        userId: row.user_id,
        username: me?.username ?? 'You',
        avatarUrl: me?.avatarUrl,
        text: row.text,
        likes: 0,
        isLiked: false,
        createdAt: row.created_at,
      };

      set((state) => ({
        comments: [comment, ...state.comments],
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post
        ),
      }));
    } catch (error) {
      console.error('[Community] Add comment error:', error);
    }
  },

  toggleLikeComment: async (commentId: string) => {
    const current = get().comments.find((c) => c.id === commentId);
    if (!current) return;

    // Optimistic toggle
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likes: Math.max(0, c.isLiked ? c.likes - 1 : c.likes + 1) }
          : c
      ),
    }));

    try {
      const newCount = await commentApi.togglePostCommentLike(commentId);
      set((state) => ({
        comments: state.comments.map((c) => (c.id === commentId ? { ...c, likes: newCount } : c)),
      }));
    } catch (error) {
      console.error('[Community] Toggle like comment error:', error);
      // Revert
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, likes: Math.max(0, c.isLiked ? c.likes - 1 : c.likes + 1) }
            : c
        ),
      }));
    }
  },

  subscribeToComments: (postId: string) => {
    get().unsubscribeFromComments();

    commentsChannel = supabase
      .channel(`post-comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          refreshComments(postId);
        }
      )
      .subscribe();
  },

  unsubscribeFromComments: () => {
    if (commentsChannel) {
      supabase.removeChannel(commentsChannel);
      commentsChannel = null;
    }
  },

  // Stories (prototype/mock)
  loadStories: async () => {
    set({ isLoadingStories: true });
    try {
      const now = new Date();
      const validStories = MOCK_STORIES.filter((story) => new Date(story.expiresAt) > now);
      set({ stories: validStories, isLoadingStories: false });
    } catch (error) {
      console.error('[Community] Load stories error:', error);
      set({ isLoadingStories: false });
    }
  },

  createStory: async (storyData) => {
    try {
      const newStory: Story = {
        ...storyData,
        id: `story-${Date.now()}`,
        viewers: [],
        isViewed: false,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({ stories: [newStory, ...state.stories] }));
    } catch (error) {
      console.error('[Community] Create story error:', error);
    }
  },

  viewStory: async (storyId: string) => {
    try {
      set((state) => ({
        stories: state.stories.map((story) =>
          story.id === storyId
            ? { ...story, isViewed: true, viewers: [...(story.viewers || []), 'me'] }
            : story
        ),
      }));
    } catch (error) {
      console.error('[Community] View story error:', error);
    }
  },

  // Follows (prototype/mock)
  toggleFollow: async (userId: string) => {
    try {
      set((state) => {
        const isFollowing = state.following.includes(userId);
        return {
          following: isFollowing
            ? state.following.filter((id) => id !== userId)
            : [...state.following, userId],
        };
      });
    } catch (error) {
      console.error('[Community] Toggle follow error:', error);
    }
  },

  loadUserRelations: async () => {
    try {
      set({
        following: ['user-1', 'user-2', 'user-4'],
        followers: ['user-2', 'user-3', 'user-5'],
      });
    } catch (error) {
      console.error('[Community] Load user relations error:', error);
    }
  },

  reset: () => {
    get().unsubscribeFromComments();
    set({
      posts: [],
      isLoadingPosts: false,
      comments: [],
      isLoadingComments: false,
      stories: MOCK_STORIES,
      isLoadingStories: false,
      following: ['user-1', 'user-2', 'user-4'],
      followers: ['user-2', 'user-3', 'user-5'],
    });
  },
}));

/**
 * If the picked image is a local file/blob URI, upload it to the dish-photos
 * bucket so other users can see it; remote URLs are stored as-is.
 */
async function ensureStoredImageUrl(photoUrl: string): Promise<string> {
  if (/^(https?:|data:)/i.test(photoUrl)) return photoUrl;
  try {
    return await uploadLocalDishPhoto(photoUrl);
  } catch (error) {
    console.error('[Community] Image upload failed, storing URI as-is:', error);
    return photoUrl;
  }
}

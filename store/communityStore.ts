/**
 * ============================================================================
 * COMMUNITY STORE
 * ============================================================================
 * Posts, comments, saves, and stories are backed by Supabase.
 *
 *   - Feed posts  : get_community_feed RPC — the per-user curated algorithm
 *                   (content + engagement + daily variation) with infinite
 *                   scroll. Feed reorders daily and adapts to new likes/saves.
 *   - Latest posts: dish_photos (newest-first) — used by the admin moderation
 *                   page, kept separate from the personalized feed.
 *   - Comments    : post_comments via lib/api/comments (no realtime).
 *   - Saves       : post_saves via lib/api/community (persisted bookmarks).
 *   - Stories     : stories + story_views via lib/api/community, grouped by
 *                   author for the stories bar.
 *   - Follows     : not built yet (out of scope for Community Mode).
 */

import { create } from 'zustand';
import { CommunityPost, Comment, Story, StoryGroup } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import * as commentApi from '@/lib/api/comments';
import * as communityApi from '@/lib/api/community';
import { uploadDishPhoto, toggleLikeDishPhoto, uploadLocalDishPhoto } from '@/lib/api/supabase';
import { fetchSettingBool } from '@/lib/api/settings';

const FEED_PAGE_SIZE = 10;
const MAX_SEEN_IDS = 300;

interface CommunityState {
  // Latest posts (admin moderation) — newest-first, not personalized.
  posts: CommunityPost[];
  isLoadingPosts: boolean;

  // Curated feed (infinite scroll)
  feedPosts: CommunityPost[];
  feedPage: number;
  feedHasMore: boolean;
  isLoadingFeed: boolean;
  isLoadingMoreFeed: boolean;
  feedSeenIds: string[];

  // Comments
  comments: Comment[];
  isLoadingComments: boolean;

  // Stories (grouped by author for the bar)
  stories: Story[];
  storyGroups: StoryGroup[];
  isLoadingStories: boolean;

  // Actions
  loadPosts: () => Promise<void>;
  loadFeed: (reset?: boolean) => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  createPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'isLiked' | 'comments' | 'shares' | 'createdAt'>) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;

  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  toggleLikeComment: (commentId: string) => Promise<void>;

  loadStories: () => Promise<void>;
  createStory: (storyData: { mediaUrl: string; mediaType: 'image' | 'video'; caption?: string; expiresAt: string }) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;

  reset: () => void;
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

/** Group stories by author (one ring per user in the stories bar). */
function buildStoryGroups(stories: Story[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const story of stories) {
    let group = map.get(story.userId);
    if (!group) {
      group = { userId: story.userId, username: story.username, avatarUrl: story.avatarUrl, stories: [] };
      map.set(story.userId, group);
    }
    group.stories.push(story);
  }
  return Array.from(map.values());
}

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  // Initial state
  posts: [],
  isLoadingPosts: false,
  feedPosts: [],
  feedPage: 0,
  feedHasMore: true,
  isLoadingFeed: false,
  isLoadingMoreFeed: false,
  feedSeenIds: [],
  comments: [],
  isLoadingComments: false,
  stories: [],
  storyGroups: [],
  isLoadingStories: false,

  // Latest posts (admin moderation page)
  loadPosts: async () => {
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
          location,
          tags,
          like_count,
          created_at,
          profiles:user_id ( username, avatar_url ),
          post_comments ( id ),
          dish_photo_likes ( user_id )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const posts: CommunityPost[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        username: row.profiles?.username ?? 'Unknown',
        avatarUrl: row.profiles?.avatar_url ?? undefined,
        photoUrl: row.image_url,
        caption: row.caption ?? '',
        location: row.location ?? undefined,
        tags: row.tags ?? [],
        likes: row.like_count ?? 0,
        isLiked: !!(row.dish_photo_likes ?? []).some((like: any) => like.user_id === userId),
        comments: (row.post_comments ?? []).length,
        shares: 0,
        createdAt: row.created_at,
      }));

      set({ posts, isLoadingPosts: false });
    } catch (error) {
      console.error('[Community] Load posts error:', error);
      set({ isLoadingPosts: false });
    }
  },

  // Curated feed with infinite scroll
  loadFeed: async (reset = false) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    if (reset) {
      // Reset wipes any in-flight state so a refresh always restarts cleanly.
      set({
        feedPosts: [],
        feedPage: 0,
        feedHasMore: true,
        feedSeenIds: [],
        isLoadingFeed: false,
        isLoadingMoreFeed: false,
      });
    } else if (get().isLoadingFeed || get().isLoadingMoreFeed) {
      return;
    }

    const page = get().feedPage;
    const seen = get().feedSeenIds;
    set({ isLoadingFeed: page === 0, isLoadingMoreFeed: page > 0 });

    try {
      const rows = await communityApi.fetchCommunityFeed({
        userId,
        limit: FEED_PAGE_SIZE,
        offset: page * FEED_PAGE_SIZE,
        seenIds: seen.slice(-MAX_SEEN_IDS),
      });
      const mapped = rows.map(communityApi.mapFeedRowToPost);

      set((state) => ({
        feedPosts: page === 0 ? mapped : [...state.feedPosts, ...mapped],
        feedPage: page + 1,
        feedHasMore: mapped.length === FEED_PAGE_SIZE,
        feedSeenIds: [...state.feedSeenIds, ...mapped.map((p) => p.id)].slice(-MAX_SEEN_IDS),
        isLoadingFeed: false,
        isLoadingMoreFeed: false,
      }));
    } catch (error) {
      console.error('[Community] Load feed error:', error);
      // On error, mark feed as exhausted to prevent infinite retry loops from onEndReached
      set({ isLoadingFeed: false, isLoadingMoreFeed: false, feedHasMore: false });
    }
  },

  loadMoreFeed: async () => {
    if (get().isLoadingFeed || get().isLoadingMoreFeed || !get().feedHasMore) return;
    await get().loadFeed(false);
  },

  createPost: async (postData) => {
    // Admin can disable dish-photo posting app-wide via Settings → Community.
    if (!(await fetchSettingBool('allow_dish_photos'))) {
      throw new Error('Posting is currently disabled by the admin.');
    }

    try {
      const imageUrl = await ensureStoredImageUrl(postData.photoUrl);
      await uploadDishPhoto({
        imageUrl,
        caption: postData.caption,
        tags: postData.tags,
        location: postData.location,
      });
      await get().loadFeed(true);
    } catch (error) {
      if (isSuspendedError(error)) {
        throw new Error('Your account has been suspended and can no longer post.');
      }
      throw error;
    }
  },

  toggleLike: async (postId: string) => {
    const post =
      get().feedPosts.find((p) => p.id === postId) ?? get().posts.find((p) => p.id === postId);
    if (!post) return;

    const nextLiked = !post.isLiked;
    const patch = (p: CommunityPost) =>
      p.id === postId
        ? { ...p, isLiked: nextLiked, likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)) }
        : p;

    // Optimistic update
    set((state) => ({ feedPosts: state.feedPosts.map(patch), posts: state.posts.map(patch) }));

    try {
      await toggleLikeDishPhoto(postId);
    } catch (error) {
      console.error('[Community] Toggle like error:', error);
      const revert = (p: CommunityPost) =>
        p.id === postId
          ? { ...p, isLiked: !nextLiked, likes: Math.max(0, p.likes + (nextLiked ? -1 : 1)) }
          : p;
      set((state) => ({ feedPosts: state.feedPosts.map(revert), posts: state.posts.map(revert) }));
    }
  },

  toggleSave: async (postId: string) => {
    const patch = (p: CommunityPost) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p);
    set((state) => ({ feedPosts: state.feedPosts.map(patch), posts: state.posts.map(patch) }));

    try {
      const next = await communityApi.toggleSavePost(postId);
      const reconcile = (p: CommunityPost) => (p.id === postId ? { ...p, isSaved: next } : p);
      set((state) => ({ feedPosts: state.feedPosts.map(reconcile), posts: state.posts.map(reconcile) }));
    } catch (error) {
      console.error('[Community] Toggle save error:', error);
      const revert = (p: CommunityPost) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p);
      set((state) => ({ feedPosts: state.feedPosts.map(revert), posts: state.posts.map(revert) }));
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
        feedPosts: state.feedPosts.map((post) =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post
        ),
      }));
    } catch (error) {
      console.error('[Community] Add comment error:', error);
      if (isSuspendedError(error)) {
        throw new Error('Your account has been suspended and can no longer comment.');
      }
      throw error;
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
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, likes: Math.max(0, c.isLiked ? c.likes - 1 : c.likes + 1) }
            : c
        ),
      }));
    }
  },

  // Stories (DB-backed, grouped by author)
  loadStories: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ isLoadingStories: true });
    try {
      const result = await communityApi.fetchStories(userId);
      const stories = result.stories.map((row) =>
        communityApi.mapStoryRowToStory(row, result.viewedStoryIds)
      );
      set({ stories, storyGroups: buildStoryGroups(stories), isLoadingStories: false });
    } catch (error) {
      console.error('[Community] Load stories error:', error);
      set({ isLoadingStories: false });
    }
  },

  createStory: async (storyData) => {
    try {
      const row = await communityApi.createStory(storyData);
      const me = useAuthStore.getState().user;

      const story: Story = {
        id: row.id,
        userId: row.user_id,
        username: me?.username ?? 'You',
        avatarUrl: me?.avatarUrl,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        caption: row.caption ?? undefined,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        viewers: [],
        isViewed: false,
      };

      const nextStories = [story, ...get().stories];
      set({ stories: nextStories, storyGroups: buildStoryGroups(nextStories) });
    } catch (error) {
      console.error('[Community] Create story error:', error);
      if (isSuspendedError(error)) {
        throw new Error('Your account has been suspended and can no longer post stories.');
      }
      throw error;
    }
  },

  viewStory: async (storyId: string) => {
    // Optimistic local update + persist.
    set((state) => {
      const nextStories = state.stories.map((story) =>
        story.id === storyId
          ? { ...story, isViewed: true, viewers: [...(story.viewers || []), 'me'] }
          : story
      );
      return { stories: nextStories, storyGroups: buildStoryGroups(nextStories) };
    });
    try {
      await communityApi.viewStory(storyId);
    } catch (error) {
      console.error('[Community] View story error:', error);
    }
  },

  reset: () => {
    set({
      posts: [],
      isLoadingPosts: false,
      feedPosts: [],
      feedPage: 0,
      feedHasMore: true,
      isLoadingFeed: false,
      isLoadingMoreFeed: false,
      feedSeenIds: [],
      comments: [],
      isLoadingComments: false,
      stories: [],
      storyGroups: [],
      isLoadingStories: false,
    });
  },
}));

/**
 * Detect an RLS insert rejection — the server-side "banned user" block from
 * migration 015. Surfaced to the user as a clear suspension message.
 */
function isSuspendedError(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = (error as any)?.message ?? '';
  return code === '42501' || /row-level security|permission denied|policy/i.test(message);
}

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

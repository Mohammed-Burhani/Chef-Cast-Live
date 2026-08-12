/**
 * Community Mode API — curated feed, bookmarks, stories, and activities.
 *
 * Backed by Supabase:
 *   - get_community_feed  → per-user curated feed RPC (score-based)
 *   - post_saves          → user bookmarks on dish_photos
 *   - stories / story_views → persisted stories + who viewed them
 *   - get_user_activity   → unified feed of a user's posts/comments/likes/saves
 *
 * Mirrors the style of lib/api/comments.ts.
 */

import { supabase } from '@/lib/supabase';
import { ActivityItem, CommunityPost, SavedPost, Story } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/** A raw row from the get_community_feed RPC. */
export interface FeedRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string;
  caption: string | null;
  location: string | null;
  tags: string[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
  score: number;
}

/** A story row joined with its author profile. */
export interface StoryRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  expires_at: string;
  created_at: string;
}

/** Result of fetching stories: the live stories + which the user already viewed. */
export interface StoriesResult {
  stories: StoryRow[];
  viewedStoryIds: string[];
}

/** A raw row from the get_user_activity RPC. */
export interface ActivityRow {
  id: string;
  activity_type: 'post' | 'comment' | 'like' | 'save';
  post_id: string;
  image_url: string;
  caption: string | null;
  text: string | null;
  created_at: string;
}

// ============================================================================
// FEED (curated algorithm)
// ============================================================================

export async function fetchCommunityFeed(params: {
  userId: string;
  limit?: number;
  offset?: number;
  daysBack?: number;
  seenIds?: string[];
}): Promise<FeedRow[]> {
  const { data, error } = await supabase.rpc('get_community_feed', {
    p_user_id: params.userId,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
    p_days_back: params.daysBack ?? 60,
    p_exclude_ids: params.seenIds ?? [],
  });
  if (error) throw error;
  return (data ?? []) as unknown as FeedRow[];
}

// ============================================================================
// BOOKMARKS (post_saves)
// ============================================================================

/** Toggle the current user's bookmark on a post; resolves to the new saved state. */
export async function toggleSavePost(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('post_saves')
    .select('id')
    .eq('photo_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('post_saves').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('post_saves').insert({ photo_id: postId, user_id: user.id });
  if (error) throw error;
  return true;
}

interface SavedPhotoRow {
  id: string;
  photo_id: string;
  created_at: string;
  dish_photos: {
    id: string;
    user_id: string;
    image_url: string;
    caption: string | null;
    location: string | null;
    tags: string[];
    like_count: number;
    created_at: string;
    profiles: { username: string; avatar_url: string | null };
  } | null;
}

/** Fetch the current user's bookmarked posts (newest save first). */
export async function fetchSavedPosts(userId: string): Promise<SavedPost[]> {
  const { data, error } = await supabase
    .from('post_saves')
    .select(`
      id,
      photo_id,
      created_at,
      dish_photos:photo_id (
        id,
        user_id,
        image_url,
        caption,
        location,
        tags,
        like_count,
        created_at,
        profiles:user_id ( username, avatar_url )
      )
    `)
    .eq('user_id', userId)
    .eq('dish_photos.is_hidden', false)
    .eq('dish_photos.profiles.is_banned', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as SavedPhotoRow[])
    .filter((row) => row.dish_photos)
    .map((row) => {
      const photo = row.dish_photos!;
      return {
        id: row.id,
        savedAt: row.created_at,
        post: {
          id: photo.id,
          userId: photo.user_id,
          username: photo.profiles?.username ?? 'Unknown',
          avatarUrl: photo.profiles?.avatar_url ?? undefined,
          photoUrl: photo.image_url,
          caption: photo.caption ?? '',
          location: photo.location ?? undefined,
          tags: photo.tags ?? [],
          likes: photo.like_count,
          isLiked: false,
          comments: 0,
          shares: 0,
          isSaved: true,
          createdAt: photo.created_at,
        },
      } as SavedPost;
    });
}

// ============================================================================
// STORIES
// ============================================================================

/** Fetch all unexpired stories (newest first) + the current user's viewed ids. */
export async function fetchStories(userId: string): Promise<StoriesResult> {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      id,
      user_id,
      media_url,
      media_type,
      caption,
      expires_at,
      created_at,
      profiles:user_id ( username, avatar_url )
    `)
    .gt('expires_at', new Date().toISOString())
    .eq('profiles.is_banned', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: views } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('user_id', userId);

  const viewedStoryIds = (views ?? []).map((v) => v.story_id);

  const stories: StoryRow[] = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    username: row.profiles?.username ?? 'Unknown',
    avatar_url: row.profiles?.avatar_url ?? null,
    media_url: row.media_url,
    media_type: row.media_type as 'image' | 'video',
    caption: row.caption ?? null,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }));

  return { stories, viewedStoryIds };
}

/** Insert a story for the current user. */
export async function createStory(params: {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  expiresAt: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: user.id,
      media_url: params.mediaUrl,
      media_type: params.mediaType,
      caption: params.caption ?? null,
      expires_at: params.expiresAt,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Record that the current user viewed a story (idempotent). */
export async function viewStory(storyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('story_views')
    .upsert({ story_id: storyId, user_id: user.id }, { onConflict: 'story_id,user_id' });
  if (error) console.error('[Community] Record story view error:', error);
}

/**
 * Upload a local media file (from the picker) to the stories bucket and return
 * its public URL. Used when a story's media is a local file/blob URI.
 */
export async function uploadStoryMedia(localUri: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) throw new Error('Not authenticated');

  const extMatch = /\.(\w{2,5})(\?|$)/.exec(localUri);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const path = `${session.session.user.id}/${Date.now()}.${ext}`;

  const blob = await (await fetch(localUri)).blob();
  const { error } = await supabase.storage
    .from('stories')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('stories').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

/** Fetch a user's unified activity feed (posts/comments/likes/saves). */
export async function fetchUserActivity(userId: string, limit = 50): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('get_user_activity', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;

  return ((data ?? []) as unknown as ActivityRow[]).map((row) => ({
    id: row.id,
    type: row.activity_type,
    postId: row.post_id,
    imageUrl: row.image_url,
    caption: row.caption ?? undefined,
    text: row.text ?? undefined,
    createdAt: row.created_at,
  }));
}

// ============================================================================
// USER PROFILE POSTS
// ============================================================================

/** Fetch a specific user's posts (newest first) for the profile grid. */
export async function fetchUserPosts(userId: string): Promise<CommunityPost[]> {
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
      dish_photo_likes ( user_id )
    `)
    .eq('user_id', userId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.profiles?.username ?? 'Unknown',
    avatarUrl: row.profiles?.avatar_url ?? undefined,
    photoUrl: row.image_url,
    caption: row.caption ?? '',
    location: row.location ?? undefined,
    tags: row.tags ?? [],
    likes: row.like_count ?? 0,
    isLiked: !!(row.dish_photo_likes ?? []).some((like: any) => like.user_id === currentUserId),
    comments: 0,
    shares: 0,
    isSaved: false,
    createdAt: row.created_at,
  }));
}

// ============================================================================
// MAPPERS (shared by store consumers)
// ============================================================================

/** Map a feed row to the app's CommunityPost shape. */
export function mapFeedRowToPost(row: FeedRow): CommunityPost {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? undefined,
    photoUrl: row.image_url,
    caption: row.caption ?? '',
    location: row.location ?? undefined,
    tags: row.tags ?? [],
    likes: row.like_count,
    isLiked: row.is_liked,
    comments: row.comment_count,
    shares: 0,
    isSaved: row.is_saved,
    createdAt: row.created_at,
  };
}

/** Map a story row to the app's Story shape. */
export function mapStoryRowToStory(row: StoryRow, viewedIds: string[]): Story {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? undefined,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    caption: row.caption ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewers: [],
    isViewed: viewedIds.includes(row.id),
  };
}

/**
 * Supabase API wrapper with React Query
 * Centralized data fetching layer
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Episode = Database['public']['Tables']['episodes']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type EpisodeScore = Database['public']['Tables']['episode_scores']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type DishPhoto = Database['public']['Tables']['dish_photos']['Row'];

// ============================================================================
// EPISODES
// ============================================================================

export async function fetchEpisodes() {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return data as Episode[];
}

export async function fetchLiveEpisode() {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('is_live', true)
    .is('ended_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No live episode
    throw error;
  }
  return data as Episode;
}

export async function fetchEpisodeById(id: string) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Episode;
}

// ============================================================================
// QUESTIONS
// ============================================================================

export async function fetchActiveQuestion(episodeId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No active question
    throw error;
  }
  return data as Question;
}

export async function fetchQuestionsByEpisode(episodeId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('episode_id', episodeId)
    .order('sequence_number', { ascending: true });

  if (error) throw error;
  return data as Question[];
}

// ============================================================================
// ANSWERS
// ============================================================================

export async function submitAnswer(params: {
  questionId: string;
  episodeId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  responseTimeMs: number;
}) {
  const { data: question } = await supabase
    .from('questions')
    .select('correct_option')
    .eq('id', params.questionId)
    .single();

  if (!question) throw new Error('Question not found');

  const isCorrect = params.selectedOption === question.correct_option;
  const basePoints = isCorrect ? 100 : 0;
  const speedBonus = isCorrect && params.responseTimeMs < 5000 ? 50 : 0;
  const totalPoints = basePoints + speedBonus;

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('answers')
    .insert({
      user_id: session.session.user.id,
      question_id: params.questionId,
      episode_id: params.episodeId,
      selected_option: params.selectedOption,
      is_correct: isCorrect,
      response_time_ms: params.responseTimeMs,
      base_points: basePoints,
      speed_bonus: speedBonus,
      total_points: totalPoints,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export async function fetchLeaderboard(episodeId: string) {
  const { data, error } = await supabase
    .from('episode_scores')
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .eq('episode_id', episodeId)
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as (EpisodeScore & { profiles: Profile })[];
}

export async function fetchGlobalLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as Profile[];
}

// ============================================================================
// PROFILE
// ============================================================================

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

// ============================================================================
// COMMUNITY - DISH PHOTOS
// ============================================================================

export async function fetchDishPhotos(episodeId?: string) {
  let query = supabase
    .from('dish_photos')
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (episodeId) {
    query = query.eq('episode_id', episodeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as (DishPhoto & { profiles: Profile })[];
}

export async function uploadDishPhoto(params: {
  imageUrl: string;
  caption?: string;
  episodeId?: string;
  tags?: string[];
  location?: string;
}) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('dish_photos')
    .insert({
      user_id: session.session.user.id,
      image_url: params.imageUrl,
      caption: params.caption,
      episode_id: params.episodeId,
      tags: params.tags ?? [],
      location: params.location,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DishPhoto;
}

/**
 * Upload a local image (from the picker) to the dish-photos bucket and return
 * its public URL. Used when a community post's image is a local file/blob URI
 * rather than a remote URL.
 */
export async function uploadLocalDishPhoto(localUri: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const extMatch = /\.(\w{2,5})(\?|$)/.exec(localUri);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const path = `${session.session.user.id}/${Date.now()}.${ext}`;

  const blob = await (await fetch(localUri)).blob();
  const { error } = await supabase.storage
    .from('dish-photos')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('dish-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function toggleLikeDishPhoto(photoId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const userId = session.session.user.id;

  // Check if already liked
  const { data: existing } = await supabase
    .from('dish_photo_likes')
    .select('id')
    .eq('photo_id', photoId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('dish_photo_likes')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase
      .from('dish_photo_likes')
      .insert({ photo_id: photoId, user_id: userId });

    if (error) throw error;
    return { liked: true };
  }
}

// ============================================================================
// FOLLOWS
// ============================================================================

export async function toggleFollow(targetUserId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const userId = session.session.user.id;

  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .single();

  if (existing) {
    // Unfollow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return { following: false };
  } else {
    // Follow
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: userId, following_id: targetUserId });

    if (error) throw error;
    return { following: true };
  }
}

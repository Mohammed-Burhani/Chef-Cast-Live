/**
 * Supabase client configuration for ChefCast: Live
 * 
 * Backend services:
 * - Authentication (Magic Link, OAuth)
 * - PostgreSQL database with Row-Level Security
 * - Realtime channels (quiz questions, leaderboard, community feed)
 * - Storage buckets (dish photos, plating guides)
 * - Edge Functions (scoring, ranking, badge awards)
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Environment variables - configure these in your .env file
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

/**
 * Supabase client instance with AsyncStorage for session persistence
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database table names
 */
export const TABLES = {
  USERS: 'users',
  EPISODES: 'episodes',
  QUIZ_QUESTIONS: 'quiz_questions',
  QUIZ_ANSWERS: 'quiz_answers',
  QUIZ_SESSIONS: 'quiz_sessions',
  LEADERBOARD: 'leaderboard',
  BADGES: 'badges',
  USER_BADGES: 'user_badges',
  COMMUNITY_POSTS: 'community_posts',
  MYSTERY_BOX_SUBMISSIONS: 'mystery_box_submissions',
  XP_LOG: 'xp_log',
} as const;

/**
 * Realtime channel names
 */
export const CHANNELS = {
  QUIZ_QUESTIONS: 'quiz-questions',
  LEADERBOARD: 'leaderboard',
  EPISODE_STATUS: 'episode-status',
  COMMUNITY_FEED: 'community-feed',
} as const;

/**
 * Storage bucket names
 */
export const BUCKETS = {
  DISH_PHOTOS: 'dish-photos',
  PLATING_GUIDES: 'plating-guides',
  EPISODE_THUMBNAILS: 'episode-thumbnails',
  USER_AVATARS: 'user-avatars',
} as const;

/**
 * Edge Function names
 */
export const FUNCTIONS = {
  CALCULATE_SCORE: 'calculate-score',
  UPDATE_LEADERBOARD: 'update-leaderboard',
  AWARD_BADGE: 'award-badge',
  SEND_NOTIFICATION: 'send-notification',
  CHECK_PERFECT_EPISODE: 'check-perfect-episode',
} as const;

/**
 * Subscribe to live quiz questions for an episode
 */
export function subscribeToQuizQuestions(
  episodeId: string,
  onQuestion: (question: any) => void
) {
  return supabase
    .channel(CHANNELS.QUIZ_QUESTIONS)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.QUIZ_QUESTIONS,
        filter: `episode_id=eq.${episodeId}`,
      },
      (payload) => {
        onQuestion(payload.new);
      }
    )
    .subscribe();
}

/**
 * Subscribe to live leaderboard updates for an episode
 */
export function subscribeToLeaderboard(
  episodeId: string,
  onUpdate: (leaderboard: any[]) => void
) {
  return supabase
    .channel(CHANNELS.LEADERBOARD)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.LEADERBOARD,
        filter: `episode_id=eq.${episodeId}`,
      },
      async () => {
        // Fetch updated leaderboard
        const { data } = await supabase
          .from(TABLES.LEADERBOARD)
          .select('*')
          .eq('episode_id', episodeId)
          .order('score', { ascending: false })
          .limit(100);
        
        if (data) {
          onUpdate(data);
        }
      }
    )
    .subscribe();
}

/**
 * Subscribe to episode status changes (live/ended)
 */
export function subscribeToEpisodeStatus(
  episodeId: string,
  onStatusChange: (isLive: boolean) => void
) {
  return supabase
    .channel(CHANNELS.EPISODE_STATUS)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: TABLES.EPISODES,
        filter: `id=eq.${episodeId}`,
      },
      (payload) => {
        onStatusChange(payload.new.is_live);
      }
    )
    .subscribe();
}

/**
 * Subscribe to community feed updates
 */
export function subscribeToCommunityFeed(
  onNewPost: (post: any) => void
) {
  return supabase
    .channel(CHANNELS.COMMUNITY_FEED)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.COMMUNITY_POSTS,
      },
      (payload) => {
        onNewPost(payload.new);
      }
    )
    .subscribe();
}

/**
 * Submit a quiz answer and calculate score
 */
export async function submitQuizAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionId: string | null,
  responseTimeMs: number
) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.CALCULATE_SCORE, {
    body: {
      sessionId,
      questionId,
      selectedOptionId,
      responseTimeMs,
    },
  });

  if (error) {
    console.error('Error submitting quiz answer:', error);
    return null;
  }

  return data;
}

/**
 * Upload a dish photo to storage
 */
export async function uploadDishPhoto(
  userId: string,
  episodeId: string,
  photoUri: string,
  caption?: string
) {
  try {
    // Convert URI to blob for upload
    const response = await fetch(photoUri);
    const blob = await response.blob();
    
    const fileName = `${userId}/${episodeId}/${Date.now()}.jpg`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKETS.DISH_PHOTOS)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.DISH_PHOTOS)
      .getPublicUrl(fileName);

    // Create community post
    const { data: postData, error: postError } = await supabase
      .from(TABLES.COMMUNITY_POSTS)
      .insert({
        user_id: userId,
        episode_id: episodeId,
        photo_url: urlData.publicUrl,
        caption: caption || '',
      })
      .select()
      .single();

    if (postError) {
      throw postError;
    }

    return postData;
  } catch (error) {
    console.error('Error uploading dish photo:', error);
    return null;
  }
}

/**
 * Check if user earned any badges after quiz completion
 */
export async function checkBadgeEligibility(userId: string, episodeId: string) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.AWARD_BADGE, {
    body: { userId, episodeId },
  });

  if (error) {
    console.error('Error checking badge eligibility:', error);
    return [];
  }

  return data?.badges || [];
}

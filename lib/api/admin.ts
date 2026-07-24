/**
 * Admin API functions - episode/question/user management
 * Requires admin role in profiles table
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// EPISODES
// ============================================================================

export async function createEpisode(params: {
  title: string;
  description: string;
  scheduled_at: string;
  thumbnail_url?: string;
}) {
  const { data, error } = await supabase
    .from('episodes')
    .insert(params)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateEpisode(id: string, updates: any) {
  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleEpisodeLive(id: string, isLive: boolean) {
  // If going live, check no other episode is live
  if (isLive) {
    const { data: liveEpisodes } = await supabase
      .from('episodes')
      .select('id')
      .eq('status', 'live');

    if (liveEpisodes && liveEpisodes.length > 0) {
      throw new Error('Another episode is already live. Only one stream at a time.');
    }
  }

  const updates: any = { is_live: isLive };
  if (isLive) {
    // When going live, clear any previous ended_at and set status
    updates.ended_at = null;
    updates.status = 'live';
  } else {
    updates.ended_at = new Date().toISOString();
    updates.status = 'ended';
  }

  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function postponeEpisode(id: string, newScheduledAt: string) {
  const { data, error } = await supabase
    .from('episodes')
    .update({ scheduled_at: newScheduledAt })
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEpisode(id: string) {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// QUESTIONS
// ============================================================================

export async function createQuestion(params: {
  episode_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  timer_seconds?: number;
  sequence_number?: number;
}) {
  // Auto-calculate sequence number if not provided
  let sequenceNumber = params.sequence_number;
  
  if (!sequenceNumber) {
    const { data: existing } = await supabase
      .from('questions')
      .select('sequence_number')
      .eq('episode_id', params.episode_id)
      .order('sequence_number', { ascending: false })
      .limit(1);

    sequenceNumber = existing && existing.length > 0 
      ? existing[0].sequence_number + 1 
      : 1;
  }

  const { data, error } = await supabase
    .from('questions')
    .insert({ ...params, sequence_number: sequenceNumber })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuestion(id: string, updates: any) {
  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleQuestionActive(id: string, isActive: boolean) {
  const updates: any = {
    is_active: isActive,
    opened_at: isActive ? new Date().toISOString() : null,
    closed_at: !isActive ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// Activate question + deactivate all others in episode (uses edge function)
export async function activateQuestionExclusive(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('activate-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.question;
}

// Deactivate all questions in episode
export async function deactivateAllQuestions(episodeId: string) {
  const { error } = await supabase
    .from('questions')
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq('episode_id', episodeId)
    .eq('is_active', true);

  if (error) throw error;
}

// Close a question (calls edge function)
export async function closeQuestion(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('close-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Dismiss a question (calls edge function)
// Marks the question as dismissed so the admin can activate the next one
export async function dismissQuestion(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('dismiss-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Auto-transition episodes from scheduled → live when their time arrives
// Can be called periodically by the admin dashboard
export async function autoTransitionLiveEpisodes() {
  const { data, error } = await supabase
    .rpc('auto_live_episodes');

  if (error) {
    console.error('auto_live_episodes RPC failed:', error.message);
    // Fallback: direct update for admin
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    const { data: directData, error: directError } = await supabase
      .from('episodes')
      .update({ is_live: true, status: 'live', ended_at: null })
      .eq('status', 'scheduled')
      .eq('is_live', false)
      .is('ended_at', null)
      .lte('scheduled_at', new Date().toISOString())
      .select('*');

    if (directError) throw directError;
    return directData || [];
  }

  return data || [];
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getEpisodeStats(episodeId: string) {
  const [scoresRes, answersRes, questionsRes] = await Promise.all([
    supabase
      .from('episode_scores')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('episode_id', episodeId)
      .order('total_score', { ascending: false }),
    supabase
      .from('answers')
      .select('*')
      .eq('episode_id', episodeId),
    supabase
      .from('questions')
      .select('id')
      .eq('episode_id', episodeId),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (answersRes.error) throw answersRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const totalParticipants = scoresRes.data.length;
  const totalAnswers = answersRes.data.length;
  const correctAnswers = answersRes.data.filter(a => a.is_correct).length;
  const avgResponseTime = totalAnswers > 0 
    ? answersRes.data.reduce((sum, a) => sum + a.response_time_ms, 0) / totalAnswers 
    : 0;

  return {
    totalParticipants,
    totalQuestions: questionsRes.data.length,
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
    avgResponseTime: Math.round(avgResponseTime),
    leaderboard: scoresRes.data.slice(0, 10),
    allParticipants: scoresRes.data,
  };
}

export async function getEpisodeParticipants(episodeId: string) {
  const { data, error } = await supabase
    .from('episode_scores')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        avatar_url,
        xp,
        level_title,
        created_at
      )
    `)
    .eq('episode_id', episodeId)
    .order('total_score', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getAllUsers(params?: {
  limit?: number;
  offset?: number;
  searchQuery?: string;
}) {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params?.searchQuery) {
    query = query.or(`username.ilike.%${params.searchQuery}%,email.ilike.%${params.searchQuery}%`);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { users: data, total: count || 0 };
}

export async function toggleUserAdmin(userId: string, isAdmin: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getUserActivity(userId: string) {
  const [episodesRes, answersRes, photosRes] = await Promise.all([
    supabase
      .from('episode_scores')
      .select('*, episodes(title, scheduled_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('answers')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('dish_photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (episodesRes.error) throw episodesRes.error;
  if (answersRes.error) throw answersRes.error;
  if (photosRes.error) throw photosRes.error;

  return {
    episodes: episodesRes.data,
    answers: answersRes.data,
    photos: photosRes.data,
    totalEpisodes: episodesRes.data.length,
    totalAnswers: answersRes.data.length,
    correctAnswers: answersRes.data.filter(a => a.is_correct).length,
    totalPhotos: photosRes.data.length,
  };
}

export async function getDashboardStats() {
  const [usersRes, episodesRes, answersRes, photosRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, created_at'),
    supabase
      .from('episodes')
      .select('id, is_live, ended_at'),
    supabase
      .from('answers')
      .select('id, created_at, is_correct'),
    supabase
      .from('dish_photos')
      .select('id, created_at'),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (episodesRes.error) throw episodesRes.error;
  if (answersRes.error) throw answersRes.error;
  if (photosRes.error) throw photosRes.error;

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newUsersThisWeek = usersRes.data.filter(
    u => new Date(u.created_at) > lastWeek
  ).length;
  
  const newPhotosThisWeek = photosRes.data.filter(
    p => new Date(p.created_at) > lastWeek
  ).length;

  return {
    totalUsers: usersRes.data.length,
    newUsersThisWeek,
    liveEpisodes: episodesRes.data.filter(e => e.is_live).length,
    upcomingEpisodes: episodesRes.data.filter(e => !e.is_live && !e.ended_at).length,
    completedEpisodes: episodesRes.data.filter(e => e.ended_at).length,
    totalAnswers: answersRes.data.length,
    correctAnswers: answersRes.data.filter(a => a.is_correct).length,
    totalPhotos: photosRes.data.length,
    newPhotosThisWeek,
  };
}

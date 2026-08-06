/**
 * Live Session API with React Query
 * Pure Supabase API calls — no Next.js API routes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryConfig } from './base';
import type { Database } from '@/types/database';

type Episode = Database['public']['Tables']['episodes']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type EpisodeScore = Database['public']['Tables']['episode_scores']['Row'];

export const liveKeys = {
  all: ['live'] as const,
  upcoming: () => [...liveKeys.all, 'upcoming'] as const,
  session: (episodeId: string) => [...liveKeys.all, 'session', episodeId] as const,
  questions: (episodeId: string) => [...liveKeys.all, 'questions', episodeId] as const,
  activeQuestion: (episodeId: string) => [...liveKeys.all, 'active', episodeId] as const,
  leaderboard: (episodeId: string) => [...liveKeys.all, 'leaderboard', episodeId] as const,
  userAnswer: (episodeId: string, questionId: string) =>
    [...liveKeys.all, 'answer', episodeId, questionId] as const,
};

// ============================================================================
// FETCHERS
// ============================================================================

/**
 * Fetch upcoming/live episodes for home screen highlights
 * - Currently live episodes (status = 'live')
 * - Episodes scheduled within the next 60 minutes
 * - Episodes past their scheduled_at but not yet live/ended (overdue, within 2h back)
 */
export async function fetchUpcomingEpisodes() {
  const now = new Date().toISOString();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Fetch: live episodes + soon-scheduled episodes + overdue episodes
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .or(
      `status.eq.live,` +
      `and(status.eq.scheduled,scheduled_at.gte.${now},scheduled_at.lte.${oneHourFromNow}),` +
      `and(status.eq.scheduled,scheduled_at.gte.${twoHoursAgo},scheduled_at.lt.${now})`
    )
    .order('is_live', { ascending: false })
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data as Episode[];
}

/**
 * Fetch full live session data (episode + questions)
 */
export async function fetchLiveSession(episodeId: string) {
  const [episodeRes, questionsRes] = await Promise.all([
    supabase.from('episodes').select('*').eq('id', episodeId).single(),
    supabase
      .from('questions')
      .select('*')
      .eq('episode_id', episodeId)
      .order('sequence_number', { ascending: true }),
  ]);

  if (episodeRes.error) throw episodeRes.error;
  if (questionsRes.error) throw questionsRes.error;

  return {
    episode: episodeRes.data as Episode,
    questions: questionsRes.data as Question[],
  };
}

/**
 * Fetch questions for an episode
 */
export async function fetchEpisodeQuestions(episodeId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('episode_id', episodeId)
    .order('sequence_number', { ascending: true });

  if (error) throw error;
  return data as Question[];
}

/**
 * Fetch the currently active question for an episode
 */
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

/**
 * Fetch leaderboard for an episode
 */
export async function fetchLiveLeaderboard(episodeId: string) {
  const { data, error } = await supabase
    .from('episode_scores')
    .select('*, profiles:user_id (username, avatar_url)')
    .eq('episode_id', episodeId)
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as (EpisodeScore & { profiles: { username: string; avatar_url: string | null } })[];
}

/**
 * Check if the current user has already answered a question
 */
export async function fetchUserAnswer(episodeId: string, questionId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('question_id', questionId)
    .eq('user_id', session.session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No answer yet
    throw error;
  }
  return data;
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Activate a question during a live session (admin only)
 * Calls the activate-question edge function
 */
export async function activateQuestion(episodeId: string, questionId: string) {
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
  return data.question as Question;
}

/**
 * Close the active question and score all answers
 * Calls the close-question edge function
 */
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

/**
 * Dismiss a question from the live view after answers and results are shown.
 * Only then can the next question be activated.
 * Calls the dismiss-question edge function.
 */
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

/**
 * Submit an answer via the score-answer edge function
 */
export async function submitAnswerLive(params: {
  questionId: string;
  episodeId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  responseTimeMs: number;
}) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('score-answer', {
    body: {
      questionId: params.questionId,
      episodeId: params.episodeId,
      selectedOption: params.selectedOption,
      responseTimeMs: params.responseTimeMs,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Fetch the current user's score + rank for a finished episode.
 * Returns null if the user never joined that episode's quiz.
 */
export async function fetchMyEpisodeScore(episodeId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) return null;
  const userId = session.session.user.id;

  const { data: myRow, error } = await supabase
    .from('episode_scores')
    .select('total_score')
    .eq('episode_id', episodeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!myRow) return null;

  // Rank = number of players with a higher score, + 1
  const { count, error: countError } = await supabase
    .from('episode_scores')
    .select('id', { count: 'exact', head: true })
    .eq('episode_id', episodeId)
    .gt('total_score', myRow.total_score);
  if (countError) throw countError;

  return { score: myRow.total_score, rank: (count ?? 0) + 1 };
}

/**
 * Start watching an episode (ensure episode_scores entry exists)
 */
export async function joinLiveSession(episodeId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');

  const userId = session.session.user.id;

  // Upsert episode_scores entry
  const { data, error } = await supabase
    .from('episode_scores')
    .upsert({
      user_id: userId,
      episode_id: episodeId,
      total_score: 0,
      correct_count: 0,
      xp_earned: 0,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'user_id,episode_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook: Get upcoming episodes for home screen
 */
export function useUpcomingEpisodes() {
  return useQuery({
    queryKey: liveKeys.upcoming(),
    queryFn: fetchUpcomingEpisodes,
    refetchInterval: 30000, // Poll every 30s
    ...queryConfig,
  });
}

/**
 * Hook: Get full live session data
 */
export function useLiveSession(episodeId: string) {
  return useQuery({
    queryKey: liveKeys.session(episodeId),
    queryFn: () => fetchLiveSession(episodeId),
    enabled: !!episodeId,
    ...queryConfig,
  });
}

/**
 * Hook: Get questions for an episode
 */
export function useEpisodeQuestions(episodeId: string) {
  return useQuery({
    queryKey: liveKeys.questions(episodeId),
    queryFn: () => fetchEpisodeQuestions(episodeId),
    enabled: !!episodeId,
    refetchInterval: false, // Don't poll - rely on realtime
    ...queryConfig,
  });
}

/**
 * Hook: Get currently active question
 */
export function useActiveQuestion(episodeId: string) {
  return useQuery({
    queryKey: liveKeys.activeQuestion(episodeId),
    queryFn: () => fetchActiveQuestion(episodeId),
    enabled: !!episodeId,
    refetchInterval: false, // Don't poll - rely on realtime
    ...queryConfig,
  });
}

/**
 * Hook: Get live leaderboard
 */
export function useLiveLeaderboard(episodeId: string) {
  return useQuery({
    queryKey: liveKeys.leaderboard(episodeId),
    queryFn: () => fetchLiveLeaderboard(episodeId),
    enabled: !!episodeId,
    refetchInterval: false, // Don't poll - rely on realtime
    ...queryConfig,
  });
}

/**
 * Hook: Check user answer for a question
 */
export function useUserAnswer(episodeId: string, questionId: string | null) {
  return useQuery({
    queryKey: liveKeys.userAnswer(episodeId, questionId || ''),
    queryFn: () => fetchUserAnswer(episodeId, questionId!),
    enabled: !!episodeId && !!questionId,
    ...queryConfig,
  });
}

/**
 * Hook: Activate question mutation (admin)
 */
export function useActivateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      activateQuestion(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveKeys.questions(data.episode_id) });
      queryClient.invalidateQueries({ queryKey: liveKeys.activeQuestion(data.episode_id) });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
    },
  });
}

/**
 * Hook: Close question mutation
 */
export function useCloseQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      closeQuestion(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveKeys.activeQuestion(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: liveKeys.questions(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: liveKeys.leaderboard(data.question?.episode_id) });
    },
  });
}

/**
 * Hook: Dismiss question mutation
 * Dismisses a question after it's been answered and results shown.
 * Only then can the next question be activated.
 */
export function useDismissQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      dismissQuestion(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveKeys.activeQuestion(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: liveKeys.questions(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: liveKeys.leaderboard(data.question?.episode_id) });
    },
  });
}

/**
 * Hook: Submit answer mutation
 */
export function useSubmitAnswerLive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAnswerLive,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: liveKeys.userAnswer(variables.episodeId, variables.questionId) });
      queryClient.invalidateQueries({ queryKey: liveKeys.leaderboard(variables.episodeId) });
    },
  });
}

/**
 * Hook: Join live session
 */
export function useJoinLiveSession() {
  return useMutation({
    mutationFn: joinLiveSession,
  });
}

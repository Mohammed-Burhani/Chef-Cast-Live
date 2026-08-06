/**
 * Scoring / Rewards API — live-quiz position-based scores and history.
 *
 * Backed by:
 *  - profiles.xp             -> overall lifetime score (rolled up by score_question)
 *  - episode_scores          -> per-event totals (total_score, rank, correct_count)
 *  - answers                 -> per-question history (total_points, rank)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryConfig } from './base';

// ============================================================================
// TYPES
// ============================================================================

export interface UserStats {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Overall lifetime XP/score */
  xp: number;
  levelTitle: string;
  totalCorrect: number;
  episodesParticipated: number;
  /** Derived aggregates from episode_scores */
  eventCount: number;
  lifetimePoints: number;
  bestRank: number | null;
}

export interface EventHistoryEntry {
  episodeId: string;
  title: string;
  scheduledAt: string;
  endedAt: string | null;
  thumbnailUrl: string | null;
  /** Total points from all quizzes in this event combined */
  totalScore: number;
  correctCount: number;
  rank: number | null;
  joinedAt: string;
}

export interface QuizHistoryEntry {
  questionId: string;
  questionText: string;
  correctOption: string | null;
  sequenceNumber: number;
  selectedOption: string;
  isCorrect: boolean;
  responseTimeMs: number;
  points: number;
  rank: number | null;
  answeredAt: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const scoringKeys = {
  all: ['scoring'] as const,
  stats: (userId: string) => [...scoringKeys.all, 'stats', userId] as const,
  eventHistory: (userId: string) => [...scoringKeys.all, 'events', userId] as const,
  quizHistory: (userId: string, episodeId: string) =>
    [...scoringKeys.all, 'quiz', userId, episodeId] as const,
};

// ============================================================================
// FETCHERS
// ============================================================================

/** Overall stats: profile XP + aggregates from episode_scores. */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, xp, level_title, total_correct, episodes_participated')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;

  const { data: scores, error: aggError } = await supabase
    .from('episode_scores')
    .select('total_score, rank')
    .eq('user_id', userId);

  if (aggError) throw aggError;

  const list = scores || [];
  const lifetimePoints = list.reduce((sum, s) => sum + (s.total_score || 0), 0);
  let bestRank: number | null = null;
  for (const s of list) {
    if (s.rank != null && (bestRank === null || s.rank < bestRank)) {
      bestRank = s.rank;
    }
  }

  return {
    userId: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    xp: profile.xp,
    levelTitle: profile.level_title,
    totalCorrect: profile.total_correct,
    episodesParticipated: profile.episodes_participated,
    eventCount: list.length,
    lifetimePoints,
    bestRank,
  };
}

/** Past live events the user participated in (events that have ended). */
export async function fetchEventHistory(userId: string): Promise<EventHistoryEntry[]> {
  const { data, error } = await supabase
    .from('episode_scores')
    .select(`
      total_score,
      correct_count,
      rank,
      joined_at,
      episodes (id, title, scheduled_at, ended_at, thumbnail_url)
    `)
    .eq('user_id', userId);

  if (error) throw error;

  return (data || [])
    .map((row) => {
      const ep = Array.isArray(row.episodes) ? row.episodes[0] : row.episodes;
      return {
        episodeId: ep?.id ?? '',
        title: ep?.title ?? 'Untitled Event',
        scheduledAt: ep?.scheduled_at ?? row.joined_at,
        endedAt: ep?.ended_at ?? null,
        thumbnailUrl: ep?.thumbnail_url ?? null,
        totalScore: row.total_score,
        correctCount: row.correct_count,
        rank: row.rank,
        joinedAt: row.joined_at,
      };
    })
    .filter((e) => e.endedAt != null)
    .sort((a, b) => (a.endedAt! > b.endedAt! ? -1 : 1));
}

/** Per-question breakdown of a user's answers within one event. */
export async function fetchQuizHistory(
  userId: string,
  episodeId: string
): Promise<QuizHistoryEntry[]> {
  const { data, error } = await supabase
    .from('answers')
    .select(`
      question_id,
      selected_option,
      is_correct,
      response_time_ms,
      total_points,
      rank,
      answered_at,
      questions (question_text, correct_option, sequence_number)
    `)
    .eq('user_id', userId)
    .eq('episode_id', episodeId);

  if (error) throw error;

  return (data || [])
    .map((row) => {
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        questionId: row.question_id,
        questionText: q?.question_text ?? 'Question',
        correctOption: q?.correct_option ?? null,
        sequenceNumber: q?.sequence_number ?? 0,
        selectedOption: row.selected_option,
        isCorrect: row.is_correct,
        responseTimeMs: row.response_time_ms,
        points: row.total_points,
        rank: row.rank,
        answeredAt: row.answered_at,
      };
    })
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

export function useUserStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: scoringKeys.stats(userId || ''),
    queryFn: () => fetchUserStats(userId!),
    enabled: !!userId,
    ...queryConfig,
  });
}

export function useEventHistory(userId: string | null | undefined) {
  return useQuery({
    queryKey: scoringKeys.eventHistory(userId || ''),
    queryFn: () => fetchEventHistory(userId!),
    enabled: !!userId,
    ...queryConfig,
  });
}

export function useQuizHistory(
  userId: string | null | undefined,
  episodeId: string | null | undefined
) {
  return useQuery({
    queryKey: scoringKeys.quizHistory(userId || '', episodeId || ''),
    queryFn: () => fetchQuizHistory(userId!, episodeId!),
    enabled: !!userId && !!episodeId,
    ...queryConfig,
  });
}

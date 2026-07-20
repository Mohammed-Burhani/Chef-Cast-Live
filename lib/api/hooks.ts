/**
 * React Query hooks for data fetching
 * Wraps Supabase API calls with caching + optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './supabase';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const keys = {
  episodes: ['episodes'] as const,
  episode: (id: string) => ['episodes', id] as const,
  liveEpisode: ['episodes', 'live'] as const,
  questions: (episodeId: string) => ['questions', episodeId] as const,
  activeQuestion: (episodeId: string) => ['questions', episodeId, 'active'] as const,
  leaderboard: (episodeId: string) => ['leaderboard', episodeId] as const,
  globalLeaderboard: ['leaderboard', 'global'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  dishPhotos: (episodeId?: string) => ['dishPhotos', episodeId] as const,
};

// ============================================================================
// EPISODES
// ============================================================================

export function useEpisodes() {
  return useQuery({
    queryKey: keys.episodes,
    queryFn: api.fetchEpisodes,
    refetchInterval: 30000, // Poll every 30s to keep live/ended states fresh
  });
}

export function useEpisode(id: string) {
  return useQuery({
    queryKey: keys.episode(id),
    queryFn: () => api.fetchEpisodeById(id),
    enabled: !!id,
  });
}

export function useLiveEpisode() {
  return useQuery({
    queryKey: keys.liveEpisode,
    queryFn: api.fetchLiveEpisode,
    refetchInterval: 30000, // Poll every 30s
  });
}

// ============================================================================
// QUESTIONS
// ============================================================================

export function useActiveQuestion(episodeId: string) {
  return useQuery({
    queryKey: keys.activeQuestion(episodeId),
    queryFn: () => api.fetchActiveQuestion(episodeId),
    enabled: !!episodeId,
    refetchInterval: 5000, // Poll every 5s during live
  });
}

export function useQuestions(episodeId: string) {
  return useQuery({
    queryKey: keys.questions(episodeId),
    queryFn: () => api.fetchQuestionsByEpisode(episodeId),
    enabled: !!episodeId,
  });
}

// ============================================================================
// ANSWERS
// ============================================================================

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.submitAnswer,
    onSuccess: (_, variables) => {
      // Invalidate leaderboard to refetch with new score
      queryClient.invalidateQueries({ queryKey: keys.leaderboard(variables.episodeId) });
    },
  });
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export function useLeaderboard(episodeId: string) {
  return useQuery({
    queryKey: keys.leaderboard(episodeId),
    queryFn: () => api.fetchLeaderboard(episodeId),
    enabled: !!episodeId,
    refetchInterval: 10000, // Poll every 10s
  });
}

export function useGlobalLeaderboard() {
  return useQuery({
    queryKey: keys.globalLeaderboard,
    queryFn: api.fetchGlobalLeaderboard,
  });
}

// ============================================================================
// PROFILE
// ============================================================================

export function useProfile(userId: string) {
  return useQuery({
    queryKey: keys.profile(userId),
    queryFn: () => api.fetchProfile(userId),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) =>
      api.updateProfile(userId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.profile(data.id), data);
    },
  });
}

// ============================================================================
// COMMUNITY
// ============================================================================

export function useDishPhotos(episodeId?: string) {
  return useQuery({
    queryKey: keys.dishPhotos(episodeId),
    queryFn: () => api.fetchDishPhotos(episodeId),
  });
}

export function useUploadDishPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.uploadDishPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.dishPhotos() });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.toggleLikeDishPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.dishPhotos() });
    },
  });
}

export function useToggleFollow() {
  return useMutation({
    mutationFn: api.toggleFollow,
  });
}

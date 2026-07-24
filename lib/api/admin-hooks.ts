/**
 * Admin React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminApi from './admin';
import { keys } from './hooks';

// ============================================================================
// EPISODES
// ============================================================================

export function useCreateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createEpisode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
    },
  });
}

export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      adminApi.updateEpisode(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
      queryClient.invalidateQueries({ queryKey: keys.episode(data.id) });
    },
  });
}

export function useToggleEpisodeLive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, isLive }: { episodeId: string; isLive: boolean }) =>
      adminApi.toggleEpisodeLive(episodeId, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
      queryClient.invalidateQueries({ queryKey: keys.liveEpisode });
      // Clear episode cache so home screen immediately reflects ended status
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
    },
  });
}

export function usePostponeEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newScheduledAt }: { id: string; newScheduledAt: string }) =>
      adminApi.postponeEpisode(id, newScheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
    },
  });
}

export function useDeleteEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteEpisode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
    },
  });
}

// ============================================================================
// QUESTIONS
// ============================================================================

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createQuestion,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(data.episode_id) });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      adminApi.updateQuestion(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(data.episode_id) });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, episodeId }: { id: string; episodeId: string }) =>
      adminApi.deleteQuestion(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(variables.episodeId) });
    },
  });
}

export function useActivateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      adminApi.activateQuestionExclusive(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(data.episode_id) });
      queryClient.invalidateQueries({ queryKey: keys.activeQuestion(data.episode_id) });
    },
  });
}

export function useDeactivateAllQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deactivateAllQuestions,
    onSuccess: (_, episodeId) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(episodeId) });
      queryClient.invalidateQueries({ queryKey: keys.activeQuestion(episodeId) });
    },
  });
}

export function useCloseQuestionAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      adminApi.closeQuestion(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: keys.activeQuestion(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: keys.leaderboard(data.question?.episode_id) });
    },
  });
}

// ============================================================================
// DISMISS QUESTION
// ============================================================================

export function useDismissQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, questionId }: { episodeId: string; questionId: string }) =>
      adminApi.dismissQuestion(episodeId, questionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.questions(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: keys.activeQuestion(data.question?.episode_id) });
      queryClient.invalidateQueries({ queryKey: keys.leaderboard(data.question?.episode_id) });
    },
  });
}

// ============================================================================
// AUTO-TRANSITION
// ============================================================================

export function useAutoTransitionEpisodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminApi.autoTransitionLiveEpisodes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.episodes });
      queryClient.invalidateQueries({ queryKey: keys.liveEpisode });
    },
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function useEpisodeStats(episodeId: string | null) {
  return useQuery({
    queryKey: ['episodeStats', episodeId],
    queryFn: () => adminApi.getEpisodeStats(episodeId!),
    enabled: !!episodeId,
  });
}

export function useEpisodeParticipants(episodeId: string | null) {
  return useQuery({
    queryKey: ['episodeParticipants', episodeId],
    queryFn: () => adminApi.getEpisodeParticipants(episodeId!),
    enabled: !!episodeId,
  });
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export function useAllUsers(params?: {
  limit?: number;
  offset?: number;
  searchQuery?: string;
}) {
  return useQuery({
    queryKey: ['allUsers', params],
    queryFn: () => adminApi.getAllUsers(params),
  });
}

export function useToggleUserAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      adminApi.toggleUserAdmin(userId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

export function useUserActivity(userId: string | null) {
  return useQuery({
    queryKey: ['userActivity', userId],
    queryFn: () => adminApi.getUserActivity(userId!),
    enabled: !!userId,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: adminApi.getDashboardStats,
    refetchInterval: 60000, // Refetch every minute
  });
}

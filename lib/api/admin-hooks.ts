/**
 * Admin React Query hooks
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as adminApi from './admin';
import * as adminNotificationsApi from './admin-notifications';
import * as settingsApi from './settings';
import { useAuthStore } from '@/store/useAuthStore';
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

export function useDuplicateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newScheduledAt }: { id: string; newScheduledAt: string }) =>
      adminApi.duplicateEpisode(id, newScheduledAt),
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

// ============================================================================
// ADMIN NOTIFICATIONS
// ============================================================================

const adminNotificationKeys = {
  all: ['adminNotifications'] as const,
};

export function useAdminNotifications() {
  return useQuery({
    queryKey: adminNotificationKeys.all,
    queryFn: adminNotificationsApi.fetchAdminNotifications,
  });
}

export function useCreateAdminNotification() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: adminNotificationsApi.AdminNotificationInput) =>
      adminNotificationsApi.createAdminNotification(input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useUpdateAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<adminNotificationsApi.AdminNotificationInput>;
    }) => adminNotificationsApi.updateAdminNotification(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useDeleteAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.deleteAdminNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useCancelAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.cancelAdminNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useRetryAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.retryAdminNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useSendNowAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.sendNowAdminNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

// ============================================================================
// APP SETTINGS
// ============================================================================

export const settingsKeys = {
  all: ['appSettings'] as const,
  cron: ['appSettings', 'cron'] as const,
  system: ['appSettings', 'system'] as const,
};

// realtime-js deduplicates channels by topic name, and `useAppSettings` can be
// mounted more than once (admin sidebar + settings screen). A per-instance
// counter keeps each subscription on its own topic so `.on()` is never called
// on an already-subscribed channel (which throws).
let appSettingsTopicId = 0;

/**
 * Current app settings (admin-configured). Subscribes to realtime so a change
 * made in one browser tab / device propagates to this screen live.
 */
export function useAppSettings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const topic = `app-settings:${++appSettingsTopicId}`;
    const channel = supabase
      .channel(topic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: settingsApi.fetchAppSettings,
  });
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: keyof settingsApi.AppSettings; value: string | boolean }) =>
      settingsApi.updateAppSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/** Installed pg_cron jobs (verifies the schedulers are alive). */
export function useCronStatus() {
  return useQuery({
    queryKey: settingsKeys.cron,
    queryFn: settingsApi.fetchCronStatus,
    staleTime: 60_000,
  });
}

/** Live DB ping + row counts for the System section. */
export function useSystemSnapshot() {
  return useQuery({
    queryKey: settingsKeys.system,
    queryFn: settingsApi.fetchSystemSnapshot,
    refetchInterval: 60_000,
  });
}

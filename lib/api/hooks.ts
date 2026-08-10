/**
 * React Query hooks for data fetching
 * Wraps Supabase API calls with caching + optimistic updates
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './supabase';
import * as recipesApi from './recipes';
import * as announcementsApi from './announcements';
import * as userNotificationsApi from './notifications';
import { supabase } from '@/lib/supabase';

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

// ============================================================================
// RECIPES
// ============================================================================

export const recipeKeys = {
  all: ['recipes'] as const,
  detail: (id: string) => ['recipes', id] as const,
};

/**
 * Fetch published recipes for the homepage + list screens.
 * Subscribes to postgres_changes on recipes so a freshly published recipe
 * appears live without a manual refresh (refetchInterval is a fallback).
 */
export function useRecipes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('recipes-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => {
        queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: () => recipesApi.fetchRecipes(false),
    refetchInterval: 30000,
  });
}

/** Fetch all recipes including unpublished — for the admin management page. */
export function useAdminRecipes() {
  return useQuery({
    queryKey: ['recipes', 'admin'],
    queryFn: () => recipesApi.fetchRecipes(true),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => recipesApi.fetchRecipeById(id),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recipesApi.createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'admin'] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: recipesApi.RecipeInput }) =>
      recipesApi.updateRecipe(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'admin'] });
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(data.id) });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesApi.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'admin'] });
    },
  });
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export const announcementKeys = {
  all: ['announcements'] as const,
  admin: ['announcements', 'admin'] as const,
};

/**
 * Fetch published announcements for the homepage + listing screen.
 * Subscribes to postgres_changes on announcements so a freshly published
 * announcement appears live without a manual refresh (refetchInterval fallback).
 */
export function useAnnouncements() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('announcements-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: announcementKeys.all,
    queryFn: announcementsApi.fetchAnnouncements,
    refetchInterval: 30000,
  });
}

/** Fetch all announcements including drafts — for the admin management page. */
export function useAdminAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.admin,
    queryFn: announcementsApi.fetchAllAnnouncements,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: announcementsApi.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: announcementsApi.AnnouncementInput }) =>
      announcementsApi.updateAnnouncement(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementsApi.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin });
    },
  });
}

// ============================================================================
// USER NOTIFICATIONS
// ============================================================================

export const notificationKeys = {
  mine: ['notifications', 'mine'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

/**
 * The current user's notifications (admin-scheduled deliveries). Subscribes to
 * realtime so a freshly-sent notification appears without a manual refresh.
 */
export function useMyNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('my-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_deliveries' }, () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.mine });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: notificationKeys.mine,
    queryFn: userNotificationsApi.fetchMyNotifications,
  });
}

export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('my-notifications-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_deliveries' }, () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: userNotificationsApi.fetchUnreadNotificationCount,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userNotificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.mine });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userNotificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.mine });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

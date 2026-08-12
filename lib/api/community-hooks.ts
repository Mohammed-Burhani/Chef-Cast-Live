/**
 * React Query hooks for Community Mode data (bookmarks, activities, stories).
 *
 * These back the per-user Settings tabs (Saved / Activities). The community
 * feed itself is managed by the community store (infinite scroll), not here.
 */

import { useQuery } from '@tanstack/react-query';

import * as communityApi from './community';

export const communityKeys = {
  savedPosts: (userId: string) => ['community', 'saved', userId] as const,
  activity: (userId: string) => ['community', 'activity', userId] as const,
  stories: (userId: string) => ['community', 'stories', userId] as const,
};

/** Bookmarked posts for a user (Saved tab). */
export function useSavedPosts(userId: string | null) {
  return useQuery({
    queryKey: communityKeys.savedPosts(userId ?? ''),
    queryFn: () => communityApi.fetchSavedPosts(userId as string),
    enabled: !!userId,
  });
}

/** A user's unified activity feed (Activities tab). */
export function useUserActivity(userId: string | null) {
  return useQuery({
    queryKey: communityKeys.activity(userId ?? ''),
    queryFn: () => communityApi.fetchUserActivity(userId as string),
    enabled: !!userId,
  });
}

/** A user's posts, for the profile grid. */
export function useUserPosts(userId: string | null) {
  return useQuery({
    queryKey: ['community', 'user-posts', userId ?? ''] as const,
    queryFn: () => communityApi.fetchUserPosts(userId as string),
    enabled: !!userId,
  });
}

/** A user's live stories + viewed ids. */
export function useStories(userId: string | null) {
  return useQuery({
    queryKey: communityKeys.stories(userId ?? ''),
    queryFn: () => communityApi.fetchStories(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

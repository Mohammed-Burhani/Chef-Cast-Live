/**
 * Admin Community React Query hooks — data + moderation mutations for the
 * admin Community page. Invalidates the shared keys so all tabs stay in sync
 * after a moderation action.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as communityAdminApi from './admin-community';

export const communityAdminKeys = {
  stats: ['communityAdmin', 'stats'] as const,
  topPosts: ['communityAdmin', 'topPosts'] as const,
  topComments: ['communityAdmin', 'topComments'] as const,
  topPosters: ['communityAdmin', 'topPosters'] as const,
  reports: ['communityAdmin', 'reports'] as const,
};

export function useCommunityAdminStats() {
  return useQuery({
    queryKey: communityAdminKeys.stats,
    queryFn: communityAdminApi.fetchCommunityAdminStats,
  });
}

export function useTopPosts() {
  return useQuery({
    queryKey: communityAdminKeys.topPosts,
    queryFn: () => communityAdminApi.fetchTopPosts(15),
  });
}

export function useTopComments() {
  return useQuery({
    queryKey: communityAdminKeys.topComments,
    queryFn: () => communityAdminApi.fetchTopComments(15),
  });
}

export function useTopPosters() {
  return useQuery({
    queryKey: communityAdminKeys.topPosters,
    queryFn: () => communityAdminApi.fetchTopPosters(15),
  });
}

export function useContentReports() {
  return useQuery({
    queryKey: communityAdminKeys.reports,
    queryFn: communityAdminApi.fetchContentReports,
  });
}

/** Invalidate every admin-community query after a moderation action. */
function useInvalidateCommunityAdmin() {
  const queryClient = useQueryClient();
  return () => {
    Object.values(communityAdminKeys).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };
}

export function useModeratePost() {
  const invalidate = useInvalidateCommunityAdmin();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: 'hide' | 'unhide' | 'delete' }) =>
      action === 'delete'
        ? communityAdminApi.deletePost(postId)
        : communityAdminApi.hidePost(postId, action === 'hide'),
    onSuccess: invalidate,
  });
}

export function useModerateComment() {
  const invalidate = useInvalidateCommunityAdmin();
  return useMutation({
    mutationFn: ({ commentId, action }: { commentId: string; action: 'hide' | 'unhide' | 'delete' }) =>
      action === 'delete'
        ? communityAdminApi.deleteComment(commentId)
        : communityAdminApi.hideComment(commentId, action === 'hide'),
    onSuccess: invalidate,
  });
}

export function useSetUserBanned() {
  const invalidate = useInvalidateCommunityAdmin();
  return useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      communityAdminApi.setUserBanned(userId, banned),
    onSuccess: invalidate,
  });
}

export function useResolveReport() {
  const invalidate = useInvalidateCommunityAdmin();
  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: 'resolved' | 'dismissed' }) =>
      communityAdminApi.resolveReport(reportId, status),
    onSuccess: invalidate,
  });
}

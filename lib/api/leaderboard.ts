/**
 * Leaderboard API with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryConfig, PaginationParams, paginateQuery, buildPaginatedResponse } from './base';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  episode: (episodeId: string) => [...leaderboardKeys.all, 'episode', episodeId] as const,
  global: () => [...leaderboardKeys.all, 'global'] as const,
};

// Fetch episode leaderboard
async function fetchEpisodeLeaderboard(episodeId: string, params?: PaginationParams) {
  let query = supabase
    .from('episode_scores')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('episode_id', episodeId)
    .order('rank', { ascending: true });

  if (params) {
    query = paginateQuery(query, params);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;
  return buildPaginatedResponse(data || [], count, params);
}

export function useEpisodeLeaderboard(episodeId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: leaderboardKeys.episode(episodeId),
    queryFn: () => fetchEpisodeLeaderboard(episodeId, params),
    enabled: !!episodeId,
    ...queryConfig,
  });
}

// Fetch global leaderboard (top XP)
async function fetchGlobalLeaderboard(params?: PaginationParams) {
  let query = supabase
    .from('profiles')
    .select('id, username, avatar_url, xp, episodes_participated', { count: 'exact' })
    .order('xp', { ascending: false });

  if (params) {
    query = paginateQuery(query, params);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;
  return buildPaginatedResponse(data || [], count, params);
}

export function useGlobalLeaderboard(params?: PaginationParams) {
  return useQuery({
    queryKey: leaderboardKeys.global(),
    queryFn: () => fetchGlobalLeaderboard(params),
    ...queryConfig,
  });
}

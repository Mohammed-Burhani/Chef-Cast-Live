/**
 * Episodes API with React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchWithError, queryConfig, PaginationParams, paginateQuery, buildPaginatedResponse } from './base';
import type { Episode } from '@/types';

export const episodeKeys = {
  all: ['episodes'] as const,
  lists: () => [...episodeKeys.all, 'list'] as const,
  list: (filters?: any) => [...episodeKeys.lists(), filters] as const,
  details: () => [...episodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...episodeKeys.details(), id] as const,
  live: () => [...episodeKeys.all, 'live'] as const,
};

// Fetch all episodes with pagination
async function fetchEpisodes(params?: PaginationParams) {
  let query = supabase
    .from('episodes')
    .select('*', { count: 'exact' })
    .order('scheduled_at', { ascending: false });

  if (params) {
    query = paginateQuery(query, params);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;
  return buildPaginatedResponse(data || [], count, params);
}

export function useEpisodes(params?: PaginationParams) {
  return useQuery({
    queryKey: episodeKeys.list(params),
    queryFn: () => fetchEpisodes(params),
    ...queryConfig,
  });
}

// Fetch single episode
async function fetchEpisode(id: string) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export function useEpisode(id: string) {
  return useQuery({
    queryKey: episodeKeys.detail(id),
    queryFn: () => fetchEpisode(id),
    enabled: !!id,
    ...queryConfig,
  });
}

// Fetch live episode
async function fetchLiveEpisode() {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('is_live', true)
    .is('ended_at', null)
    .single();

  if (error) throw error;
  return data;
}

export function useLiveEpisode() {
  return useQuery({
    queryKey: episodeKeys.live(),
    queryFn: fetchLiveEpisode,
    refetchInterval: 10000, // Poll every 10s
    ...queryConfig,
  });
}

// Subscribe to live episode changes
export function useEpisodeSubscription(episodeId: string, onUpdate: (episode: Episode) => void) {
  React.useEffect(() => {
    const channel = supabase
      .channel(`episode:${episodeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'episodes',
          filter: `id=eq.${episodeId}`,
        },
        (payload) => {
          onUpdate(payload.new as Episode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [episodeId, onUpdate]);
}

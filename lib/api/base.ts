/**
 * Base API utilities with React Query
 */

import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

export interface ApiResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Generic fetch with error handling
 */
export async function fetchWithError<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await promise;
    return { data, error };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Paginate query
 */
export function paginateQuery<T>(
  query: any,
  params?: PaginationParams
) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return query.range(from, to);
}

/**
 * Build paginated response
 */
export function buildPaginatedResponse<T>(
  data: T[],
  count: number | null,
  params?: PaginationParams
): PaginatedResponse<T> {
  const page = params?.page || 1;
  const pageSize = params?.limit || 20;
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return {
    data,
    count: count || 0,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * React Query default options
 */
export const queryConfig = {
  staleTime: 1000 * 60 * 5, // 5 min
  cacheTime: 1000 * 60 * 10, // 10 min
  retry: 1,
  refetchOnWindowFocus: false,
};

/**
 * Admin Community API — moderation + analytics for the admin Community page.
 *
 * Backed by the RPCs in migration 015 (get_community_admin_stats, get_top_posts,
 * get_top_comments, get_top_posters, get_content_reports) plus direct writes
 * that rely on the admin-only RLS policies added there.
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminCommunityStats {
  total_posts: number;
  total_comments: number;
  total_likes: number;
  total_saves: number;
  total_stories: number;
  total_posters: number;
  pending_reports: number;
  hidden_posts: number;
  hidden_comments: number;
  banned_users: number;
  posts_this_week: number;
  comments_this_week: number;
  likes_this_week: number;
  saves_this_week: number;
}

export interface TopPostRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  engagement: number;
  is_hidden: boolean;
  created_at: string;
}

export interface TopCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  post_caption: string | null;
  like_count: number;
  is_hidden: boolean;
  created_at: string;
}

export interface TopPosterRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  post_count: number;
  likes_received: number;
  comments_received: number;
  saves_received: number;
  engagement: number;
  is_banned: boolean;
}

export interface ContentReportRow {
  id: string;
  reporter_id: string;
  reporter_username: string;
  reporter_avatar_url: string | null;
  target_type: 'post' | 'comment';
  target_id: string;
  target_author_id: string | null;
  target_author_username: string | null;
  target_content: string | null;
  target_image_url: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

// ============================================================================
// READ (admin RPCs)
// ============================================================================

export async function fetchCommunityAdminStats(): Promise<AdminCommunityStats> {
  const { data, error } = await (supabase.rpc as any)('get_community_admin_stats');
  if (error) throw error;
  return data as AdminCommunityStats;
}

export async function fetchTopPosts(limit = 15): Promise<TopPostRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_top_posts', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as TopPostRow[];
}

export async function fetchTopComments(limit = 15): Promise<TopCommentRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_top_comments', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as TopCommentRow[];
}

export async function fetchTopPosters(limit = 15): Promise<TopPosterRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_top_posters', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as TopPosterRow[];
}

export async function fetchContentReports(): Promise<ContentReportRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_content_reports');
  if (error) throw error;
  return (data ?? []) as ContentReportRow[];
}

// ============================================================================
// MODERATION ACTIONS (rely on admin-only RLS policies from migration 015)
// ============================================================================

export async function hidePost(postId: string, hidden: boolean) {
  const { error } = await supabase
    .from('dish_photos')
    .update({ is_hidden: hidden })
    .eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('dish_photos').delete().eq('id', postId);
  if (error) throw error;
}

export async function hideComment(commentId: string, hidden: boolean) {
  const { error } = await supabase
    .from('post_comments')
    .update({ is_hidden: hidden })
    .eq('id', commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function setUserBanned(userId: string, banned: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: banned })
    .eq('id', userId);
  if (error) throw error;
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
  const { error } = await supabase
    .from('content_reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw error;
}

/**
 * Community post comments API
 * Comments on dish_photos (community posts), backed by Supabase.
 *
 * - fetchPostComments       → get_post_comments RPC (history + likes + liked state in one call)
 * - addPostComment          → INSERT into post_comments
 * - togglePostCommentLike   → toggle_post_comment_like RPC (atomic, returns new count)
 *
 * Realtime delivery is handled by the community store, which subscribes to
 * postgres_changes INSERT events on post_comments for the open post.
 */

import { supabase } from '@/lib/supabase';

export interface PostCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  like_count: number;
  is_liked: boolean;
}

/** Load a post's comments (newest first) with author + like state. */
export async function fetchPostComments(postId: string): Promise<PostCommentRow[]> {
  // The Database type doesn't model RPC function signatures, so cast the call.
  const { data, error } = await (supabase.rpc as any)('get_post_comments', { p_post_id: postId });
  if (error) throw error;
  return (data ?? []) as unknown as PostCommentRow[];
}

/** Insert a new comment on a post. Returns the inserted row. */
export async function addPostComment(postId: string, text: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, text })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Toggle the current user's like on a comment; resolves to the new like count. */
export async function togglePostCommentLike(commentId: string): Promise<number> {
  const { data, error } = await (supabase.rpc as any)('toggle_post_comment_like', {
    p_comment_id: commentId,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

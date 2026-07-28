/**
 * Edge Function: post-comment
 * Handles posting live comments for quiz episodes with rate limiting.
 *
 * Flow:
 *   1. Validates JWT and extracts user ID
 *   2. Validates comment text (length, content)
 *   3. Rate limits: max 5 comments per 10 seconds per user per episode
 *   4. Inserts comment into the database
 *   5. Fetches user profile for username/avatar
 *   6. Broadcasts the comment via Supabase Realtime Broadcast
 *
 * Broadcast vs postgres_changes:
 *   - Broadcast messages bypass the database entirely
 *   - Sub-millisecond latency (direct WebSocket push)
 *   - No WAL bloat from high comment volume
 *   - Can handle millions of messages
 *   - The DB write is only for persistence/history
 *
 * POST /functions/v1/post-comment
 * Body: { episodeId: string, text: string }
 * Headers: Authorization: Bearer <user-jwt>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting config
const MAX_COMMENTS_PER_WINDOW = 5;
const WINDOW_SECONDS = 10;
const MAX_COMMENT_LENGTH = 200;
const MIN_COMMENT_LENGTH = 1;

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const jwtPayload = decodeJwt(token);
    const userId = jwtPayload?.sub as string | undefined;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Parse body ----
    const { episodeId, text } = await req.json();

    if (!episodeId || typeof episodeId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid episodeId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedText = text.trim();

    if (trimmedText.length < MIN_COMMENT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Comment cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trimmedText.length > MAX_COMMENT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Comment too long (max ${MAX_COMMENT_LENGTH} characters)` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Basic content sanitization - strip potential XSS
    const cleanText = trimmedText
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // ---- Service-role client for DB ops ----
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ---- Rate limiting ----
    const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    // Check existing rate limit record
    const { data: existingLimit } = await supabase
      .from('comment_rate_limits')
      .select('id, comment_count, window_start')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (existingLimit) {
      const windowStartDate = new Date(existingLimit.window_start);
      const now = new Date();

      // If within the current window
      if (now.getTime() - windowStartDate.getTime() < WINDOW_SECONDS * 1000) {
        // Check if over limit
        if (existingLimit.comment_count >= MAX_COMMENTS_PER_WINDOW) {
          const retryAfter = Math.ceil(
            (windowStartDate.getTime() + WINDOW_SECONDS * 1000 - now.getTime()) / 1000
          );
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfterSeconds: retryAfter,
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
              },
            }
          );
        }

        // Increment counter
        await supabase
          .from('comment_rate_limits')
          .update({ comment_count: existingLimit.comment_count + 1 })
          .eq('id', existingLimit.id);
      } else {
        // Window expired - reset
        await supabase
          .from('comment_rate_limits')
          .update({
            comment_count: 1,
            window_start: new Date().toISOString(),
          })
          .eq('id', existingLimit.id);
      }
    } else {
      // First comment from this user for this episode
      await supabase
        .from('comment_rate_limits')
        .insert({
          user_id: userId,
          episode_id: episodeId,
          comment_count: 1,
          window_start: new Date().toISOString(),
        });
    }

    // ---- Fetch user profile ----
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    const username = profile?.username ?? 'Anonymous';
    const avatarUrl = profile?.avatar_url ?? null;

    // ---- Insert comment ----
    const now = new Date().toISOString();
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        episode_id: episodeId,
        user_id: userId,
        text: cleanText,
        created_at: now,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert comment:', insertError.message);
      throw insertError;
    }

    // ---- Broadcast via Realtime ----
    // This is the key to scalability: the broadcast goes through Supabase's
    // WebSocket infrastructure directly, bypassing the database entirely.
    // All connected clients receive it in < 50ms without any DB load.
    const channel = supabase.channel(`comments:${episodeId}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_comment',
      payload: {
        commentId: comment.id,
        episodeId,
        userId,
        username,
        avatarUrl,
        text: cleanText,
        createdAt: now,
      },
    });

    // ---- Cleanup: remove old rate limits (best-effort, non-blocking) ----
    // Only run cleanup ~1% of the time to avoid overhead
    if (Math.random() < 0.01) {
      supabase.rpc('cleanup_old_rate_limits').then(() => {}).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        commentId: comment.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('post-comment error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Edge Function: dismiss-question
 * Dismisses a question from the live view after it has been answered and results shown.
 *
 * This is the final "clean-up" step in the question lifecycle:
 *   activated → closed/scored → dismissed (you are here)
 *
 * - Marks dismissed_at = now()
 * - Ensures is_active = false, closed_at is set
 * - Recalculates episode ranks
 * - Only the next question can be activated after this one is dismissed
 *
 * POST /functions/v1/dismiss-question
 * Body: { questionId: string, episodeId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth client — verify the user is authenticated
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service-role client for DB operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { questionId, episodeId } = await req.json();

    if (!questionId || !episodeId) {
      return new Response(JSON.stringify({ error: 'Missing questionId or episodeId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .eq('episode_id', episodeId)
      .single();

    if (questionError || !question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Already dismissed — idempotent
    if (question.dismissed_at) {
      // Fetch current leaderboard
      const { data: leaderboard } = await supabase
        .from('episode_scores')
        .select('*, profiles:user_id (username, avatar_url)')
        .eq('episode_id', episodeId)
        .order('total_score', { ascending: false })
        .limit(100);

      return new Response(
        JSON.stringify({
          success: true,
          alreadyDismissed: true,
          question: { ...question, is_active: false },
          leaderboard: leaderboard || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Dismiss the question: set dismissed_at, ensure inactive
    const now = new Date().toISOString();
    const { data: dismissedQuestion, error: dismissError } = await supabase
      .from('questions')
      .update({
        dismissed_at: now,
        is_active: false,
        closed_at: question.closed_at || now, // Set closed_at if not already set
      })
      .eq('id', questionId)
      .select('*')
      .single();

    if (dismissError) throw dismissError;

    // Recalculate ranks for this episode
    const { error: rankError } = await supabase.rpc('recalculate_episode_ranks', {
      p_episode_id: episodeId,
    });

    if (rankError) {
      console.error('Rank recalculation failed:', rankError.message);
      // Fallback: client-side rank update
      const { data: scores } = await supabase
        .from('episode_scores')
        .select('id, total_score')
        .eq('episode_id', episodeId)
        .order('total_score', { ascending: false });

      if (scores) {
        for (let i = 0; i < scores.length; i++) {
          await supabase
            .from('episode_scores')
            .update({ rank: i + 1 })
            .eq('id', scores[i].id);
        }
      }
    }

    // Fetch final leaderboard
    const { data: leaderboard } = await supabase
      .from('episode_scores')
      .select('*, profiles:user_id (username, avatar_url)')
      .eq('episode_id', episodeId)
      .order('total_score', { ascending: false })
      .limit(100);

    return new Response(
      JSON.stringify({
        success: true,
        question: dismissedQuestion,
        leaderboard: leaderboard || [],
        dismissedAt: now,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

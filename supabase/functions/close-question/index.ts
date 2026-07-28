/**
 * Edge Function: close-question
 * Closes the active question, scores all pending answers, and updates leaderboard ranks.
 *
 * - Sets is_active=false, closed_at=now()
 * - Scores all unscored answers for the current question
 * - Updates episode_scores for all participants
 * - Recalculates ranks
 * - Inserts quiz_events row for race-condition-free delivery
 * - Idempotent: safe to call multiple times
 *
 * POST /functions/v1/close-question
 * Body: { questionId: string, episodeId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Extract and decode JWT — gateway already verified the signature
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = decodeJwt(token);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client for DB operations (bypasses RLS)
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
      .single();

    if (questionError || !question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent: if already closed, return existing scores
    if (!question.is_active) {
      const { data: scores } = await supabase
        .from('episode_scores')
        .select('*')
        .eq('episode_id', episodeId)
        .order('total_score', { ascending: false });

      return new Response(
        JSON.stringify({
          success: true,
          alreadyClosed: true,
          question: { ...question, is_active: false },
          scores: scores || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Close the question
    const now = new Date().toISOString();
    const { data: closedQuestion, error: closeError } = await supabase
      .from('questions')
      .update({
        is_active: false,
        closed_at: now,
      })
      .eq('id', questionId)
      .select('*')
      .single();

    if (closeError) throw closeError;

    // Get the correct answer details
    const correctOption = question.correct_option;
    const timerSeconds = question.timer_seconds;

    // Fetch all answers for this question that may need scoring
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', questionId)
      .eq('episode_id', episodeId);

    if (answersError) throw answersError;

    // Recalculate ranks for this episode
    const { error: rankError } = await supabase.rpc('recalculate_episode_ranks', {
      p_episode_id: episodeId,
    });

    // If the RPC doesn't exist, fall back to client-side rank update
    if (rankError) {
      console.error('Rank recalculation RPC failed, using fallback:', rankError.message);

      const { data: scores } = await supabase
        .from('episode_scores')
        .select('id, total_score, user_id')
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

    // Insert quiz_events row for race-condition-free delivery
    const { error: eventError } = await supabase
      .from('quiz_events')
      .insert({
        episode_id: episodeId,
        event_type: 'QUESTION_CLOSED',
        payload: {
          questionId: closedQuestion.id,
          correctOption: correctOption,
          closedAt: now,
        },
      });

    if (eventError) {
      console.error('Failed to insert quiz_events row:', eventError.message);
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
        question: closedQuestion,
        correctOption,
        totalAnswers: answers?.length || 0,
        leaderboard: leaderboard || [],
        closedAt: now,
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

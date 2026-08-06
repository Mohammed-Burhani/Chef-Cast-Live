/**
 * Edge Function: score-answer
 * Scores a user's answer to a live quiz question
 * 
 * Request body:
 * - questionId: string
 * - episodeId: string
 * - selectedOption: 'a' | 'b' | 'c' | 'd'
 * - responseTimeMs: number
 * 
 * Returns:
 * - isCorrect: boolean
 * - pointsEarned: number
 * - newTotalScore: number
 * - newCorrectCount: number
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  questionId: string;
  episodeId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  responseTimeMs: number;
}

interface Question {
  id: string;
  correct_option: string;
  timer_seconds: number;
  is_active: boolean;
}

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
  // Handle CORS preflight
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

    // Service-role client for DB operations (bypasses RLS so answer
    // submissions work without per-user auth checks)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const body: RequestBody = await req.json();
    const { questionId, episodeId, selectedOption, responseTimeMs } = body;

    // Validate inputs
    if (!questionId || !episodeId || !selectedOption || responseTimeMs === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['a', 'b', 'c', 'd'].includes(selectedOption)) {
      return new Response(JSON.stringify({ error: 'Invalid option' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch question
    const { data: question, error: questionError } = await supabaseClient
      .from('questions')
      .select('id, correct_option, timer_seconds, is_active')
      .eq('id', questionId)
      .single<Question>();

    if (questionError || !question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if question is still active (optional - allow late submissions)
    // if (!question.is_active) {
    //   return new Response(JSON.stringify({ error: 'Question is closed' }), {
    //     status: 400,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }

    // Calculate correctness
    const isCorrect = selectedOption === question.correct_option;

    // Position-based scoring: points (20/15/10/5/0) are assigned at question
    // close by score_question(). Here we only report the user's LIVE provisional
    // rank among correct answers so far (fastest correct answer = #1).
    let position: number | null = null;
    if (isCorrect) {
      const { count, error: posError } = await supabaseClient
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', questionId)
        .eq('is_correct', true)
        .lt('response_time_ms', responseTimeMs);

      if (posError) {
        console.error('Position count error:', posError.message);
      } else {
        position = (count ?? 0) + 1;
      }
    }

    // Insert answer record (will fail with 23505 if duplicate).
    // total_points stays 0 until score_question() runs at close; the
    // on_answer_inserted trigger still bumps correct_count immediately.
    const { error: answerError } = await supabaseClient
      .from('answers')
      .insert({
        user_id: userId,
        question_id: questionId,
        episode_id: episodeId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        response_time_ms: responseTimeMs,
        base_points: 0,
        speed_bonus: 0,
        total_points: 0,
      });

    // Check for duplicate submission (unique constraint violation)
    if (answerError) {
      if (answerError.code === '23505') {
        // Duplicate submission - return existing score
        const { data: existingScore } = await supabaseClient
          .from('episode_scores')
          .select('total_score, correct_count')
          .eq('user_id', userId)
          .eq('episode_id', episodeId)
          .single();

        return new Response(
          JSON.stringify({
            isCorrect,
            pointsEarned: 0,
            position: null,
            newTotalScore: existingScore?.total_score ?? 0,
            newCorrectCount: existingScore?.correct_count ?? 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw answerError;
    }

    // The on_answer_inserted trigger already updates episode_scores.
    // Fetch the updated values.
    const { data: updatedScore, error: fetchError } = await supabaseClient
      .from('episode_scores')
      .select('total_score, correct_count')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (fetchError) {
      console.error('Score fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          isCorrect,
          pointsEarned: 0,
          position,
          newTotalScore: 0,
          newCorrectCount: isCorrect ? 1 : 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        isCorrect,
        pointsEarned: 0,
        position,
        newTotalScore: updatedScore.total_score,
        newCorrectCount: updatedScore.correct_count,
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

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Calculate points
    const BASE_POINTS = 100;
    const MAX_SPEED_BONUS = 50;
    
    let basePoints = 0;
    let speedBonus = 0;
    let totalPoints = 0;

    if (isCorrect) {
      basePoints = BASE_POINTS;
      
      // Speed bonus: linear decay from MAX_SPEED_BONUS to 0
      // Faster answers get more bonus
      const timeSeconds = responseTimeMs / 1000;
      const maxTime = question.timer_seconds;
      const speedRatio = Math.max(0, 1 - (timeSeconds / maxTime));
      speedBonus = Math.floor(MAX_SPEED_BONUS * speedRatio);
      
      totalPoints = basePoints + speedBonus;
    }

    // Insert answer record (will fail with 23505 if duplicate)
    const { error: answerError } = await supabaseClient
      .from('answers')
      .insert({
        user_id: user.id,
        question_id: questionId,
        episode_id: episodeId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        response_time_ms: responseTimeMs,
        base_points: basePoints,
        speed_bonus: speedBonus,
        total_points: totalPoints,
      });

    // Check for duplicate submission (unique constraint violation)
    if (answerError) {
      if (answerError.code === '23505') {
        // Duplicate submission - return existing score
        const { data: existingScore } = await supabaseClient
          .from('episode_scores')
          .select('total_score, correct_count')
          .eq('user_id', user.id)
          .eq('episode_id', episodeId)
          .single();

        return new Response(
          JSON.stringify({
            isCorrect,
            pointsEarned: 0,
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

    // Update episode_scores
    const { data: updatedScore, error: scoreError } = await supabaseClient.rpc(
      'update_episode_score',
      {
        p_user_id: user.id,
        p_episode_id: episodeId,
        p_points: totalPoints,
        p_is_correct: isCorrect,
      }
    );

    if (scoreError) {
      console.error('Score update error:', scoreError);
      // Fallback: manual update
      const { data: currentScore } = await supabaseClient
        .from('episode_scores')
        .select('total_score, correct_count')
        .eq('user_id', user.id)
        .eq('episode_id', episodeId)
        .single();

      const newTotalScore = (currentScore?.total_score ?? 0) + totalPoints;
      const newCorrectCount = (currentScore?.correct_count ?? 0) + (isCorrect ? 1 : 0);

      await supabaseClient
        .from('episode_scores')
        .update({
          total_score: newTotalScore,
          correct_count: newCorrectCount,
        })
        .eq('user_id', user.id)
        .eq('episode_id', episodeId);

      return new Response(
        JSON.stringify({
          isCorrect,
          pointsEarned: totalPoints,
          newTotalScore,
          newCorrectCount,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return result
    return new Response(
      JSON.stringify({
        isCorrect,
        pointsEarned: totalPoints,
        newTotalScore: updatedScore.new_total_score,
        newCorrectCount: updatedScore.new_correct_count,
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

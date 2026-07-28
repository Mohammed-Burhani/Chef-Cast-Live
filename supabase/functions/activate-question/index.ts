/**
 * Edge Function: activate-question
 * Exclusively activates a question for a live episode.
 *
 * IMPROVED: No longer sets `closed_at` on the old question during deactivation.
 * The old question's `closed_at` was already set when `close-question` ran.
 * Setting it again here triggers a false `postgres_changes` event that gets
 * interpreted as QUESTION_CLOSED on the client, causing a race condition where
 * the newly activated question is immediately hidden.
 *
 * Also inserts a `quiz_events` row for reliable broadcast-style delivery
 * (belt-and-suspenders alongside the Realtime postgres_changes mechanism).
 *
 * - Validates admin role
 * - Checks question hasn't been activated before
 * - Deactivates any currently active question in the episode (without touching closed_at)
 * - Activates the target question
 * - Sets has_been_activated = true, is_active = true, opened_at = now()
 *
 * POST /functions/v1/activate-question
 * Body: { questionId: string, episodeId: string }
 * Headers: Authorization: Bearer <user-jwt>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Decode a JWT payload without verifying the signature.
 * The Supabase gateway verifies the JWT before forwarding to the edge function,
 * so signature verification is not needed here.
 */
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
    // Extract and decode JWT from Authorization header
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

    // Service-role client for admin operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Check if question was already activated
    if (question.has_been_activated) {
      return new Response(JSON.stringify({ error: 'Question has already been activated and cannot be activated again' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FIX: Deactivate any currently active question WITHOUT setting closed_at.
    // The old question's closed_at was already set when close-question ran.
    // Setting it again here would trigger a false postgres_changes event
    // that gets interpreted as QUESTION_CLOSED on the client.
    const { error: deactivateError } = await supabase
      .from('questions')
      .update({
        is_active: false,
        // NOTE: closed_at intentionally NOT set here.
        // It was already set by close-question edge function.
        // Setting it again would fire a spurious QUESTION_CLOSED event.
      })
      .eq('episode_id', episodeId)
      .eq('is_active', true);

    if (deactivateError) {
      throw deactivateError;
    }

    // Activate the target question
    const now = new Date().toISOString();
    const { data: activatedQuestion, error: activateError } = await supabase
      .from('questions')
      .update({
        is_active: true,
        opened_at: now,
        has_been_activated: true,
        closed_at: null,
      })
      .eq('id', questionId)
      .eq('episode_id', episodeId)
      .select('*')
      .single();

    if (activateError) {
      throw activateError;
    }

    // FIX: Insert a quiz_events row for reliable broadcast-style delivery.
    // This is read by the client's postgres_changes subscription on the
    // quiz_events table, providing a race-condition-free delivery path.
    const { error: eventError } = await supabase
      .from('quiz_events')
      .insert({
        episode_id: episodeId,
        event_type: 'QUESTION_ACTIVATED',
        payload: {
          questionId: activatedQuestion.id,
          questionText: activatedQuestion.question_text,
          optionA: activatedQuestion.option_a,
          optionB: activatedQuestion.option_b,
          optionC: activatedQuestion.option_c,
          optionD: activatedQuestion.option_d,
          timerSeconds: activatedQuestion.timer_seconds,
          openedAt: activatedQuestion.opened_at,
          sequenceNumber: activatedQuestion.sequence_number,
        },
      });

    if (eventError) {
      // Log but don't fail — the postgres_changes on the questions table
      // will still deliver the activation event (belt and suspenders).
      console.error('Failed to insert quiz_events row:', eventError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        question: activatedQuestion,
        openedAt: now,
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

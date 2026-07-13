/**
 * Admin API functions - episode/question management
 * Requires admin role in profiles table
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// EPISODES
// ============================================================================

export async function createEpisode(params: {
  title: string;
  description: string;
  scheduled_at: string;
  thumbnail_url?: string;
}) {
  const { data, error } = await supabase
    .from('episodes')
    .insert(params)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateEpisode(id: string, updates: any) {
  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleEpisodeLive(id: string, isLive: boolean) {
  // If going live, check no other episode is live
  if (isLive) {
    const { data: liveEpisodes } = await supabase
      .from('episodes')
      .select('id')
      .eq('is_live', true);

    if (liveEpisodes && liveEpisodes.length > 0) {
      throw new Error('Another episode is already live. Only one stream at a time.');
    }
  }

  const updates: any = { is_live: isLive };
  if (!isLive) {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function postponeEpisode(id: string, newScheduledAt: string) {
  const { data, error } = await supabase
    .from('episodes')
    .update({ scheduled_at: newScheduledAt })
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEpisode(id: string) {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// QUESTIONS
// ============================================================================

export async function createQuestion(params: {
  episode_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  timer_seconds?: number;
  sequence_number: number;
}) {
  const { data, error } = await supabase
    .from('questions')
    .insert(params)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuestion(id: string, updates: any) {
  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleQuestionActive(id: string, isActive: boolean) {
  const updates: any = {
    is_active: isActive,
    opened_at: isActive ? new Date().toISOString() : null,
    closed_at: !isActive ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// Activate question + deactivate all others in episode
export async function activateQuestionExclusive(episodeId: string, questionId: string) {
  // Deactivate all questions in episode
  await supabase
    .from('questions')
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq('episode_id', episodeId)
    .eq('is_active', true);

  // Activate target question
  const { data, error } = await supabase
    .from('questions')
    .update({
      is_active: true,
      opened_at: new Date().toISOString(),
      closed_at: null,
    })
    .eq('id', questionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// Deactivate all questions in episode
export async function deactivateAllQuestions(episodeId: string) {
  const { error } = await supabase
    .from('questions')
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq('episode_id', episodeId)
    .eq('is_active', true);

  if (error) throw error;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getEpisodeStats(episodeId: string) {
  const [scoresRes, answersRes] = await Promise.all([
    supabase
      .from('episode_scores')
      .select('*')
      .eq('episode_id', episodeId),
    supabase
      .from('answers')
      .select('*')
      .eq('episode_id', episodeId),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (answersRes.error) throw answersRes.error;

  const totalParticipants = scoresRes.data.length;
  const totalAnswers = answersRes.data.length;
  const correctAnswers = answersRes.data.filter(a => a.is_correct).length;
  const avgResponseTime = answersRes.data.reduce((sum, a) => sum + a.response_time_ms, 0) / totalAnswers;

  return {
    totalParticipants,
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
    avgResponseTime: Math.round(avgResponseTime),
  };
}

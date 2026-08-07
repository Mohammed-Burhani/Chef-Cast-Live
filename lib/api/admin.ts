/**
 * Admin API functions - episode/question/user management
 * Requires admin role in profiles table
 */

import { supabase } from '@/lib/supabase';
import {
  buildDailySeries,
  buildTopEpisodes,
  computeGrowth,
  countActiveUsersToday,
  cumulativeWithBaseline,
  lastNDays,
  startOfDay,
} from '@/lib/utils/analytics';
import type {
  EpisodeStatusCounts,
  SeriesPoint,
  TopEpisode,
} from '@/lib/utils/analytics';

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
      .eq('status', 'live');

    if (liveEpisodes && liveEpisodes.length > 0) {
      throw new Error('Another episode is already live. Only one stream at a time.');
    }
  }

  const updates: any = { is_live: isLive };
  if (isLive) {
    // When going live, clear any previous ended_at and set status
    updates.ended_at = null;
    updates.status = 'live';
  } else {
    updates.ended_at = new Date().toISOString();
    updates.status = 'ended';
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

// Duplicate an episode for a future broadcast: copies all episode details and
// its quiz questions, but with a fresh schedule (admin picks the date first).
export async function duplicateEpisode(sourceEpisodeId: string, newScheduledAt: string) {
  const [episodeRes, questionsRes] = await Promise.all([
    supabase
      .from('episodes')
      .select('*')
      .eq('id', sourceEpisodeId)
      .single(),
    supabase
      .from('questions')
      .select('*')
      .eq('episode_id', sourceEpisodeId)
      .order('sequence_number', { ascending: true }),
  ]);

  if (episodeRes.error) throw episodeRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const source = episodeRes.data;

  // New episode with the same details, only the schedule differs.
  const { data: episode, error: insertError } = await supabase
    .from('episodes')
    .insert({
      title: source.title,
      description: source.description,
      scheduled_at: newScheduledAt,
      thumbnail_url: source.thumbnail_url,
      youtube_url: source.youtube_url,
      default_timer_seconds: source.default_timer_seconds,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  // Copy the quiz over as fresh questions (state fields like is_active,
  // has_been_activated, opened_at, closed_at are left at their defaults).
  const questionCopies = (questionsRes.data || []).map((q) => ({
    episode_id: episode.id,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    timer_seconds: q.timer_seconds,
    sequence_number: q.sequence_number,
  }));

  let questionsCopied = 0;
  if (questionCopies.length > 0) {
    const { error: qError } = await supabase.from('questions').insert(questionCopies);
    if (qError) throw qError;
    questionsCopied = questionCopies.length;
  }

  return { episode, questionsCopied };
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
  sequence_number?: number;
}) {
  // Auto-calculate sequence number if not provided
  let sequenceNumber = params.sequence_number;
  
  if (!sequenceNumber) {
    const { data: existing } = await supabase
      .from('questions')
      .select('sequence_number')
      .eq('episode_id', params.episode_id)
      .order('sequence_number', { ascending: false })
      .limit(1);

    sequenceNumber = existing && existing.length > 0 
      ? existing[0].sequence_number + 1 
      : 1;
  }

  const { data, error } = await supabase
    .from('questions')
    .insert({ ...params, sequence_number: sequenceNumber })
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

// Activate question + deactivate all others in episode (uses edge function)
export async function activateQuestionExclusive(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('activate-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.question;
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

// Close a question (calls edge function)
export async function closeQuestion(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('close-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Dismiss a question (calls edge function)
// Marks the question as dismissed so the admin can activate the next one
export async function dismissQuestion(episodeId: string, questionId: string) {
  // Force a token refresh — getSession() returns cached tokens which may be expired
  const { error: refreshError } = await supabase.auth.getUser();
  if (refreshError) throw new Error('Session expired. Please log in again.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('dismiss-question', {
    body: { questionId, episodeId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Auto-transition episodes from scheduled → live when their time arrives
// Can be called periodically by the admin dashboard
export async function autoTransitionLiveEpisodes() {
  const { data, error } = await supabase
    .rpc('auto_live_episodes');

  if (error) {
    console.error('auto_live_episodes RPC failed:', error.message);
    // Fallback: direct update for admin
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    const { data: directData, error: directError } = await supabase
      .from('episodes')
      .update({ is_live: true, status: 'live', ended_at: null })
      .eq('status', 'scheduled')
      .eq('is_live', false)
      .is('ended_at', null)
      .lte('scheduled_at', new Date().toISOString())
      .select('*');

    if (directError) throw directError;
    return directData || [];
  }

  return data || [];
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getEpisodeStats(episodeId: string) {
  const [scoresRes, answersRes, questionsRes] = await Promise.all([
    supabase
      .from('episode_scores')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('episode_id', episodeId)
      .order('total_score', { ascending: false }),
    supabase
      .from('answers')
      .select('*')
      .eq('episode_id', episodeId),
    supabase
      .from('questions')
      .select('id')
      .eq('episode_id', episodeId),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (answersRes.error) throw answersRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const totalParticipants = scoresRes.data.length;
  const totalAnswers = answersRes.data.length;
  const correctAnswers = answersRes.data.filter(a => a.is_correct).length;
  const avgResponseTime = totalAnswers > 0 
    ? answersRes.data.reduce((sum, a) => sum + a.response_time_ms, 0) / totalAnswers 
    : 0;

  return {
    totalParticipants,
    totalQuestions: questionsRes.data.length,
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
    avgResponseTime: Math.round(avgResponseTime),
    leaderboard: scoresRes.data.slice(0, 10),
    allParticipants: scoresRes.data,
  };
}

export async function getEpisodeParticipants(episodeId: string) {
  const { data, error } = await supabase
    .from('episode_scores')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        avatar_url,
        xp,
        level_title,
        created_at
      )
    `)
    .eq('episode_id', episodeId)
    .order('total_score', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getAllUsers(params?: {
  limit?: number;
  offset?: number;
  searchQuery?: string;
}) {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params?.searchQuery) {
    query = query.or(`username.ilike.%${params.searchQuery}%,email.ilike.%${params.searchQuery}%`);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { users: data, total: count || 0 };
}

export async function toggleUserAdmin(userId: string, isAdmin: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getUserActivity(userId: string) {
  const [episodesRes, answersRes, photosRes] = await Promise.all([
    supabase
      .from('episode_scores')
      .select('*, episodes(title, scheduled_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('answers')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('dish_photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (episodesRes.error) throw episodesRes.error;
  if (answersRes.error) throw answersRes.error;
  if (photosRes.error) throw photosRes.error;

  return {
    episodes: episodesRes.data,
    answers: answersRes.data,
    photos: photosRes.data,
    totalEpisodes: episodesRes.data.length,
    totalAnswers: answersRes.data.length,
    correctAnswers: answersRes.data.filter(a => a.is_correct).length,
    totalPhotos: photosRes.data.length,
  };
}

export type TopScorer = {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  level_title: string;
  total_correct: number;
  episodes_participated: number;
  /** 1-based overall rank by XP */
  rank: number;
};

export type AdminDashboardStats = {
  // ── Totals / legacy fields (names preserved) ────────────────────────────
  totalUsers: number;
  newUsersThisWeek: number;
  liveEpisodes: number;
  upcomingEpisodes: number;
  completedEpisodes: number;
  totalAnswers: number;
  correctAnswers: number;
  totalPhotos: number;
  newPhotosThisWeek: number;
  totalRecipes: number;
  publishedRecipes: number;

  // ── New key stats ───────────────────────────────────────────────────────
  newUsersToday: number;
  newUsersThisMonth: number;
  /** Week-over-week signup growth %, null when previous week was 0 */
  usersGrowthPct: number | null;
  /** Distinct users with activity (answer / join / photo) today */
  activeToday: number;
  accuracyPct: number;
  avgResponseTimeMs: number;
  totalLikes: number;
  totalComments: number;
  totalFollows: number;
  totalBadgesAwarded: number;

  // ── Chart series (last 14 days) ─────────────────────────────────────────
  signupsDaily: SeriesPoint[];
  /** Cumulative signups, anchored at the true pre-window total */
  signupsSeries: SeriesPoint[];
  answersDaily: SeriesPoint[];

  // ── Episode status ──────────────────────────────────────────────────────
  episodeStatus: EpisodeStatusCounts;

  // ── Lists ───────────────────────────────────────────────────────────────
  topScorers: TopScorer[];
  topEpisodes: TopEpisode[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [usersRes, topScorersRes, episodesRes, answersRes, scoresRes, photosRes, commentsRes, recipesRes, followsRes, badgesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, created_at'),
    supabase
      .from('profiles')
      .select('id, username, avatar_url, xp, level_title, total_correct, episodes_participated')
      .order('xp', { ascending: false })
      .limit(10),
    supabase
      .from('episodes')
      .select('id, title, status, is_live, ended_at'),
    supabase
      .from('answers')
      .select('id, user_id, episode_id, is_correct, response_time_ms, answered_at'),
    supabase
      .from('episode_scores')
      .select('id, user_id, episode_id, created_at'),
    supabase
      .from('dish_photos')
      .select('id, user_id, created_at, like_count'),
    supabase
      .from('post_comments')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('recipes')
      .select('id, created_at, is_published'),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('user_badges')
      .select('id', { count: 'exact', head: true }),
  ]);

  for (const res of [usersRes, topScorersRes, episodesRes, answersRes, scoresRes, photosRes, commentsRes, recipesRes, followsRes, badgesRes]) {
    if (res.error) throw res.error;
  }

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const days = lastNDays(14, now);

  const users = usersRes.data ?? [];
  const episodes = episodesRes.data ?? [];
  const answers = answersRes.data ?? [];
  const photos = photosRes.data ?? [];
  const recipes = recipesRes.data ?? [];
  const scores = scoresRes.data ?? [];
  const topScorers = topScorersRes.data ?? [];

  const newUsersToday = users.filter(
    (u) => new Date(u.created_at) >= startOfDay(now)
  ).length;
  const newUsersThisWeek = users.filter(
    (u) => new Date(u.created_at) > lastWeek
  ).length;
  const newUsersThisMonth = users.filter((u) => {
    const d = new Date(u.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const currentWeek = users.filter((u) => new Date(u.created_at) > lastWeek).length;
  const previousWeek = users.filter(
    (u) => {
      const d = new Date(u.created_at);
      return d > twoWeeksAgo && d <= lastWeek;
    }
  ).length;

  const newPhotosThisWeek = photos.filter(
    (p) => new Date(p.created_at) > lastWeek
  ).length;

  const correctAnswers = answers.filter((a) => a.is_correct).length;
  const accuracyPct =
    answers.length > 0
      ? Math.round((correctAnswers / answers.length) * 1000) / 10
      : 0;
  const avgResponseTimeMs =
    answers.length > 0
      ? Math.round(
          answers.reduce((sum, a) => sum + a.response_time_ms, 0) / answers.length
        )
      : 0;

  // Episode status — derived from the same booleans as the legacy counts so
  // the donut always agrees with the totals above.
  let live = 0;
  let ended = 0;
  let scheduled = 0;
  for (const ep of episodes) {
    if (ep.is_live) live += 1;
    else if (ep.ended_at) ended += 1;
    else scheduled += 1;
  }

  const episodeLites = episodes.map((ep) => ({
    id: ep.id,
    title: ep.title,
    status: ep.is_live ? 'live' as const : ep.ended_at ? 'ended' as const : 'scheduled' as const,
  }));
  const scoreLites = scores.map((s) => ({
    user_id: s.user_id,
    episode_id: s.episode_id,
  }));
  const answerLites = answers.map((a) => ({
    episode_id: a.episode_id,
    is_correct: a.is_correct,
  }));

  return {
    totalUsers: users.length,
    newUsersThisWeek,
    liveEpisodes: live,
    upcomingEpisodes: scheduled,
    completedEpisodes: ended,
    totalAnswers: answers.length,
    correctAnswers,
    totalPhotos: photos.length,
    newPhotosThisWeek,
    totalRecipes: recipes.length,
    publishedRecipes: recipes.filter((r) => r.is_published).length,

    newUsersToday,
    newUsersThisMonth,
    usersGrowthPct: computeGrowth(currentWeek, previousWeek),
    activeToday: countActiveUsersToday(answers, scores, photos, now),
    accuracyPct,
    avgResponseTimeMs,
    totalLikes: photos.reduce((sum, p) => sum + (p.like_count ?? 0), 0),
    totalComments: commentsRes.count ?? 0,
    totalFollows: followsRes.count ?? 0,
    totalBadgesAwarded: badgesRes.count ?? 0,

    signupsDaily: buildDailySeries(
      users.map((u) => ({ createdAt: u.created_at })),
      days
    ),
    signupsSeries: cumulativeWithBaseline(
      buildDailySeries(users.map((u) => ({ createdAt: u.created_at })), days),
      users.filter((u) => new Date(u.created_at) < days[0]).length
    ),
    answersDaily: buildDailySeries(
      answers.map((a) => ({ createdAt: a.answered_at })),
      days
    ),

    episodeStatus: { scheduled, live, ended },

    topScorers: topScorers.map((p, index) => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      xp: p.xp,
      level_title: p.level_title,
      total_correct: p.total_correct,
      episodes_participated: p.episodes_participated,
      rank: index + 1,
    })),
    topEpisodes: buildTopEpisodes(episodeLites, scoreLites, answerLites).slice(0, 5),
  };
}

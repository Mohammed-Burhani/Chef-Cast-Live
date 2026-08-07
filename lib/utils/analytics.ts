/**
 * Pure analytics helpers for the admin dashboard.
 *
 * Framework-free (plain Date, no react-native imports) so it can be unit
 * tested with `bun test`. All date bucketing uses LOCAL time — never
 * toISOString() (which shifts to UTC and mis-buckets near midnight).
 */

export type SeriesPoint = {
  /** Local YYYY-MM-DD — stable key for the day bucket */
  key: string;
  /** Short axis label, e.g. "08/01" */
  label: string;
  /** Value for the bucket */
  count: number;
};

export type EpisodeStatusCounts = {
  scheduled: number;
  live: number;
  ended: number;
};

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Local YYYY-MM-DD key (zero-padded manually). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Short axis label "MM/DD". */
export function formatShortLabel(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

/** Array of `n` day-start Dates ending today (index n-1 === today). */
export function lastNDays(n: number, now: Date): Date[] {
  const today = startOfDay(now);
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDays(today, -i));
  }
  return days;
}

/**
 * Bucket rows into `days` by their created_at, one bucket per day.
 * Rows older than the window are ignored.
 */
export function buildDailySeries(
  rows: { createdAt: string }[],
  days: Date[]
): SeriesPoint[] {
  const byKey = new Map<string, number>();
  for (const d of days) {
    byKey.set(toDateKey(d), 0);
  }

  for (const row of rows) {
    const key = toDateKey(new Date(row.createdAt));
    if (byKey.has(key)) {
      byKey.set(key, (byKey.get(key) ?? 0) + 1);
    }
  }

  return days.map((d) => ({
    key: toDateKey(d),
    label: formatShortLabel(d),
    count: byKey.get(toDateKey(d)) ?? 0,
  }));
}

/**
 * Turn a daily (non-cumulative) series into a cumulative one, starting from
 * `baseline` (the count of rows that fell before the window). Prefix-sum keeps
 * the line anchored at the true total rather than 0.
 */
export function cumulativeWithBaseline(
  daily: SeriesPoint[],
  baseline: number
): SeriesPoint[] {
  let acc = baseline;
  return daily.map((point) => {
    acc += point.count;
    return { ...point, count: acc };
  });
}

/**
 * Week-over-week growth %. Returns null when the previous period is 0
 * (growth is undefined, not infinite).
 */
export function computeGrowth(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type EpisodeLite = {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
};

export type ScoreLite = {
  user_id: string;
  episode_id: string;
};

export type AnswerLite = {
  episode_id: string;
  is_correct: boolean;
};

export type TopEpisode = {
  episodeId: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
  participants: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracyPct: number;
};

/**
 * Rank episodes by participant count (distinct users), then total answers.
 * Joins scores + answers onto episode metadata. Only episodes with at least
 * one participant are included.
 */
export function buildTopEpisodes(
  episodes: EpisodeLite[],
  scores: ScoreLite[],
  answers: AnswerLite[]
): TopEpisode[] {
  const byId = new Map(episodes.map((e) => [e.id, e]));

  const participants = new Map<string, Set<string>>();
  for (const s of scores) {
    let set = participants.get(s.episode_id);
    if (!set) {
      set = new Set();
      participants.set(s.episode_id, set);
    }
    set.add(s.user_id);
  }

  const tallies = new Map<string, { total: number; correct: number }>();
  for (const a of answers) {
    const t = tallies.get(a.episode_id) ?? { total: 0, correct: 0 };
    t.total += 1;
    if (a.is_correct) t.correct += 1;
    tallies.set(a.episode_id, t);
  }

  const result: TopEpisode[] = [];
  for (const [episodeId, users] of participants) {
    const ep = byId.get(episodeId);
    if (!ep) continue;
    const tally = tallies.get(episodeId) ?? { total: 0, correct: 0 };
    result.push({
      episodeId,
      title: ep.title,
      status: ep.status,
      participants: users.size,
      totalAnswers: tally.total,
      correctAnswers: tally.correct,
      accuracyPct:
        tally.total > 0 ? Math.round((tally.correct / tally.total) * 1000) / 10 : 0,
    });
  }

  return result.sort(
    (a, b) =>
      b.participants - a.participants || b.totalAnswers - a.totalAnswers
  );
}

export type AnswerActivityLite = { user_id: string; answered_at: string };
export type ScoreActivityLite = { user_id: string; created_at: string };
export type PhotoActivityLite = { user_id: string; created_at: string };

/** Distinct users with any activity today (answers, episode joins, photos). */
export function countActiveUsersToday(
  answers: AnswerActivityLite[],
  scores: ScoreActivityLite[],
  photos: PhotoActivityLite[],
  now: Date
): number {
  const today = startOfDay(now);
  const users = new Set<string>();

  const stampInWindow = (stamp: string) => new Date(stamp) >= today;

  for (const a of answers) {
    if (stampInWindow(a.answered_at)) users.add(a.user_id);
  }
  for (const s of scores) {
    if (stampInWindow(s.created_at)) users.add(s.user_id);
  }
  for (const p of photos) {
    if (stampInWindow(p.created_at)) users.add(p.user_id);
  }

  return users.size;
}

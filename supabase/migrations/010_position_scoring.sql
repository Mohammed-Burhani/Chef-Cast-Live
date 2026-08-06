-- ============================================================================
-- Migration 010: Position-based scoring & score history
--
-- Replaces the time-based scoring model (100 base + up to 50 speed bonus) with
-- position/rank-based scoring:
--
--   rank 1  -> 20 pts
--   rank 2  -> 15 pts
--   rank 3  -> 10 pts
--   rank 4+ ->  5 pts
--   wrong   ->  0 pts
--
-- A question's rank is determined among CORRECT answers, fastest first.
-- Points are finalized when the question closes via `score_question()` below,
-- in ONE set-based SQL pass so it stays fast at ~30k participants.
--
-- A user's lifetime XP (`profiles.xp`) is rolled up from every scored answer,
-- which powers the overall total shown on Home and the Achievements "Level" tab.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-question rank on answers (NULL until the question is scored)
-- ---------------------------------------------------------------------------
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS rank INTEGER;

-- ---------------------------------------------------------------------------
-- 2. Index for live-position counts (during a question) + close-time ranking
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_answers_question_rank
  ON public.answers (question_id, is_correct, response_time_ms);

-- ---------------------------------------------------------------------------
-- 3. score_question: finalize one question's ranks + points
--
--    Idempotent: only correct answers with rank IS NULL and submitted before
--    the question closed are scored. Re-running after a duplicate/racing
--    close-question call is a no-op (guarded by ROW_COUNT below).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.score_question(p_question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_episode_id UUID;
  v_scored     INTEGER;
BEGIN
  SELECT episode_id INTO v_episode_id
  FROM questions
  WHERE id = p_question_id;

  IF v_episode_id IS NULL THEN
    RETURN;
  END IF;

  -- 1) Rank unscored CORRECT answers (fastest first) and assign points.
  WITH ranked AS (
    SELECT
      a.id,
      ROW_NUMBER() OVER (
        ORDER BY a.response_time_ms ASC, a.answered_at ASC, a.id ASC
      ) AS q_rank
    FROM answers a
    WHERE a.question_id = p_question_id
      AND a.is_correct = true
      AND a.rank IS NULL
      AND a.answered_at <= (
        SELECT closed_at FROM questions WHERE id = p_question_id
      )
  )
  UPDATE answers a
  SET rank = r.q_rank,
      total_points = CASE
        WHEN r.q_rank = 1 THEN 20
        WHEN r.q_rank = 2 THEN 15
        WHEN r.q_rank = 3 THEN 10
        ELSE 5
      END
  FROM ranked r
  WHERE a.id = r.id;

  GET DIAGNOSTICS v_scored = ROW_COUNT;

  IF v_scored = 0 THEN
    -- Nothing new to score (already scored or no correct answers).
    PERFORM public.recalculate_episode_ranks(v_episode_id);
    RETURN;
  END IF;

  -- 2) Add this question's (just-scored) points to each participant's episode
  --    score. correct_count is already maintained live by the
  --    on_answer_inserted trigger, so only total_score is touched here.
  UPDATE episode_scores es
  SET total_score = es.total_score + sub.points
  FROM (
    SELECT user_id, SUM(total_points) AS points
    FROM answers
    WHERE question_id = p_question_id
      AND total_points > 0
    GROUP BY user_id
  ) sub
  WHERE es.user_id = sub.user_id
    AND es.episode_id = v_episode_id;

  -- 3) Roll this question's points into lifetime XP / correct totals.
  UPDATE profiles p
  SET xp = p.xp + sub.points,
      total_correct = p.total_correct + sub.correct
  FROM (
    SELECT user_id,
           SUM(total_points) AS points,
           COUNT(*) AS correct
    FROM answers
    WHERE question_id = p_question_id
      AND total_points > 0
    GROUP BY user_id
  ) sub
  WHERE p.id = sub.user_id;

  -- 4) Refresh overall episode standings.
  PERFORM public.recalculate_episode_ranks(v_episode_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Keep profiles.episodes_participated accurate as users join new events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_episode_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET episodes_participated = episodes_participated + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_episode_score_created ON episode_scores;
CREATE TRIGGER on_episode_score_created
  AFTER INSERT ON episode_scores
  FOR EACH ROW EXECUTE FUNCTION public.track_episode_participation();

-- ---------------------------------------------------------------------------
-- 5. Backfill lifetime XP / correct totals from existing event scores
--    (runs once when this migration is applied; safe when episode_scores is empty)
-- ---------------------------------------------------------------------------
UPDATE profiles p
SET xp = COALESCE(sub.xp, 0),
    total_correct = COALESCE(sub.correct, 0),
    episodes_participated = COALESCE(sub.events, 0)
FROM (
  SELECT es.user_id,
         SUM(es.total_score) AS xp,
         SUM(es.correct_count) AS correct,
         COUNT(*) AS events
  FROM episode_scores es
  GROUP BY es.user_id
) sub
WHERE p.id = sub.user_id;

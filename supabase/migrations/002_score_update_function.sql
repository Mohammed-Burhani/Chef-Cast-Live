-- Migration: Score Update Function
-- Creates RPC function for atomic episode score updates with rank recalculation

-- Function: update_episode_score
-- Atomically updates user's episode score and recalculates ranks
CREATE OR REPLACE FUNCTION update_episode_score(
  p_user_id UUID,
  p_episode_id UUID,
  p_points INT,
  p_is_correct BOOLEAN
)
RETURNS TABLE(
  new_total_score INT,
  new_correct_count INT,
  new_rank INT
) AS $$
DECLARE
  v_new_total_score INT;
  v_new_correct_count INT;
  v_new_rank INT;
BEGIN
  -- Update score atomically
  UPDATE episode_scores
  SET 
    total_score = total_score + p_points,
    correct_count = correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END
  WHERE user_id = p_user_id AND episode_id = p_episode_id
  RETURNING total_score, correct_count INTO v_new_total_score, v_new_correct_count;

  -- If no row exists, create it
  IF NOT FOUND THEN
    INSERT INTO episode_scores (user_id, episode_id, total_score, correct_count, joined_at)
    VALUES (p_user_id, p_episode_id, p_points, CASE WHEN p_is_correct THEN 1 ELSE 0 END, NOW())
    RETURNING total_score, correct_count INTO v_new_total_score, v_new_correct_count;
  END IF;

  -- Recalculate ranks for this episode
  -- Rank by total_score DESC, then by joined_at ASC (earlier join = better rank for ties)
  WITH ranked_scores AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, joined_at ASC) AS new_rank
    FROM episode_scores
    WHERE episode_id = p_episode_id
  )
  UPDATE episode_scores es
  SET rank = rs.new_rank
  FROM ranked_scores rs
  WHERE es.id = rs.id AND es.episode_id = p_episode_id;

  -- Get user's new rank
  SELECT rank INTO v_new_rank
  FROM episode_scores
  WHERE user_id = p_user_id AND episode_id = p_episode_id;

  -- Return updated values
  RETURN QUERY SELECT v_new_total_score, v_new_correct_count, v_new_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_episode_score(UUID, UUID, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_episode_score(UUID, UUID, INT, BOOLEAN) TO anon;

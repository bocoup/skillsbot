WITH latest_expertise_log AS (
  SELECT
    slack_user_id,
    expertise_id,
    MAX(created_at) AS created_at
  FROM expertise_slack_user_log
  WHERE expertise_id = ${expertiseId}
  GROUP BY slack_user_id, expertise_id
), latest_ranking AS (
  SELECT
    interest_scale_id,
    experience_scale_id
  FROM latest_expertise_log latest
  INNER JOIN expertise_slack_user_log log
    ON log.slack_user_id = latest.slack_user_id
    AND log.expertise_id = latest.expertise_id
    AND log.created_at = latest.created_at
), interest_count AS (
  SELECT
    ranking,
    COUNT(r) AS count
  FROM interest_scale i_scale
  LEFT JOIN latest_ranking r ON (r.interest_scale_id = i_scale.id)
  GROUP BY ranking
  ORDER BY ranking
), experience_count AS (
  SELECT
    ranking,
    COUNT(r) AS count
  FROM experience_scale e_scale
  LEFT JOIN latest_ranking r ON (r.experience_scale_id = e_scale.id)
  GROUP BY ranking
  ORDER BY ranking
)
SELECT
  (SELECT ARRAY_AGG(ARRAY[ranking::numeric, count]) as interest FROM interest_count),
  (SELECT ARRAY_AGG(ARRAY[ranking::numeric, count]) as experience FROM experience_count)

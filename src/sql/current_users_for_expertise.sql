WITH latest_expertise_log AS (
  SELECT
    slack_user_id,
    expertise_id,
    MAX(created_at) AS created_at
  FROM expertise_slack_user_log
  WHERE expertise_id = ${expertiseId}
  GROUP BY slack_user_id, expertise_id
)
SELECT
  i_scale.ranking AS interest,
  e_scale.ranking AS experience,
  ARRAY_AGG(usr.slack_id ORDER BY usr.slack_id) AS users
FROM latest_expertise_log latest
INNER JOIN expertise_slack_user_log log
  ON log.slack_user_id = latest.slack_user_id
  AND log.expertise_id = latest.expertise_id
  AND log.created_at = latest.created_at
INNER JOIN interest_scale i_scale ON (i_scale.id = log.interest_scale_id)
INNER JOIN experience_scale e_scale ON (e_scale.id = log.experience_scale_id)
INNER JOIN slack_user usr ON (usr.id = latest.slack_user_id)
GROUP BY interest, experience
ORDER BY interest, experience

SELECT
  i_scale.ranking AS interest,
  e_scale.ranking AS experience,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-cur.created_at))::INTEGER AS age
FROM expertise_current cur
INNER JOIN interest_scale i_scale ON (i_scale.id = cur.interest_scale_id)
INNER JOIN experience_scale e_scale ON (e_scale.id = cur.experience_scale_id)
INNER JOIN slack_user usr ON (usr.id = cur.slack_user_id)
WHERE usr.slack_id = ${userId}
AND expertise_id = ${expertiseId}

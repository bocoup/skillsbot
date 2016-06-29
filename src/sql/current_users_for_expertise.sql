SELECT
  i_scale.ranking AS interest,
  e_scale.ranking AS experience,
  ARRAY_AGG(usr.slack_id ORDER BY usr.slack_id) AS users
FROM expertise_current cur
INNER JOIN interest_scale i_scale ON (i_scale.id = cur.interest_scale_id)
INNER JOIN experience_scale e_scale ON (e_scale.id = cur.experience_scale_id)
INNER JOIN slack_user usr ON (usr.id = cur.slack_user_id)
WHERE expertise_id = ${expertiseId}
GROUP BY interest, experience
ORDER BY interest, experience

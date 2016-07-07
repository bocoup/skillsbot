SELECT
  int.ranking AS interest,
  exp.ranking AS experience,
  ARRAY_AGG(usr.slack_id ORDER BY usr.slack_id) AS users
FROM skill_current cur
INNER JOIN interest_scale int ON (int.id = cur.interest_scale_id)
INNER JOIN experience_scale exp ON (exp.id = cur.experience_scale_id)
INNER JOIN slack_user usr ON (usr.id = cur.slack_user_id)
WHERE usr.is_active = true AND skill_id = ${skillId}
GROUP BY interest, experience
ORDER BY interest, experience

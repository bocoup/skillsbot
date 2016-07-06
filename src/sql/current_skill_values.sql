SELECT
  int.ranking AS interest,
  exp.ranking AS experience,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-cur.created_at))::INTEGER AS age
FROM skill_current cur
INNER JOIN interest_scale int ON (int.id = cur.interest_scale_id)
INNER JOIN experience_scale exp ON (exp.id = cur.experience_scale_id)
INNER JOIN slack_user usr ON (usr.id = cur.slack_user_id)
WHERE usr.is_active = true AND usr.slack_id = ${userId}
AND skill_id = ${skillId}

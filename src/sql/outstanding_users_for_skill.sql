SELECT
  ARRAY_AGG(usr.slack_id) AS users
FROM slack_user usr, skill sk
WHERE usr.is_active = true AND sk.id = ${skillId}
AND (
  SELECT COUNT(*)
  FROM skill_current cur
  WHERE cur.slack_user_id = usr.id AND cur.skill_id = sk.id
) = 0

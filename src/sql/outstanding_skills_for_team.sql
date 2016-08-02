SELECT
  usr.slack_id as slack_id,
  ARRAY_AGG(sk.name ORDER BY sk.name) AS skills
FROM slack_user usr, skill sk
WHERE usr.is_active = true
AND usr.slack_team_id = (SELECT id FROM slack_team WHERE token = ${token})
AND sk.description IS NOT NULL
AND (
  SELECT COUNT(*)
  FROM skill_current cur
  WHERE cur.slack_user_id = usr.id AND cur.skill_id = sk.id
) = 0
GROUP BY slack_id

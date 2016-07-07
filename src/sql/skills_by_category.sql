SELECT
  cat.name AS name,
  ARRAY_AGG(sk.name ORDER BY sk.name) AS skills
FROM skill sk
INNER JOIN skill_category cat ON (sk.skill_category_id = cat.id)
INNER JOIN slack_team team ON (cat.slack_team_id = team.id)
WHERE team.token = ${token} AND cat.parent_id IS NULL
GROUP BY cat.name
ORDER BY cat.name

SELECT
  cat.name AS name,
  ARRAY_AGG(exp.name ORDER BY exp.name) AS expertises
FROM expertise exp
INNER JOIN expertise_category cat ON (exp.expertise_category_id = cat.id)
INNER JOIN slack_team team ON (cat.slack_team_id = team.id)
WHERE team.slack_id = ${team_id} AND cat.parent_id IS NULL
GROUP BY cat.name
ORDER BY cat.name

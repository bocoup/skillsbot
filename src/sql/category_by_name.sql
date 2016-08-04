SELECT
  cat.id,
  cat.name,
  cat.is_active
FROM skill_category cat
INNER JOIN slack_team team ON (team.id = slack_team_id)
WHERE team.token = ${token} AND name ILIKE '%'||${search}::text||'%'

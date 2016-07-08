SELECT name
FROM skill_category
INNER JOIN slack_team team ON (team.id = slack_team_id)
WHERE team.token = ${token} AND name ILIKE '%'||${search}::text||'%'

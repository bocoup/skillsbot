SELECT
  exp.id as id,
  exp.name as name,
  exp.description as description,
  cat.name as category
from expertise exp
INNER JOIN expertise_category cat ON (cat.id = exp.expertise_category_id)
INNER JOIN slack_team team ON (team.id = cat.slack_team_id)
WHERE team.slack_id = ${teamId} AND exp.name ILIKE '%'||${search}::text||'%'

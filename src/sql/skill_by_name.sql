SELECT
  sk.id as id,
  sk.name as name,
  sk.description as description,
  cat.name as category
from skill sk
INNER JOIN skill_category cat ON (cat.id = sk.skill_category_id)
INNER JOIN slack_team team ON (team.id = cat.slack_team_id)
WHERE team.token = ${token} AND sk.name ILIKE '%'||${search}::text||'%'

UPDATE skill_category
SET is_active = ${isActive}
WHERE name = ${name}
AND slack_team_id = (SELECT id FROM slack_team WHERE token = ${token})

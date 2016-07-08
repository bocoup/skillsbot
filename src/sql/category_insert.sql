INSERT INTO skill_category (
  name,
  slack_team_id
)
VALUES (
  ${name},
  (SELECT id FROM slack_team WHERE token = ${token})
)
RETURNING id, name

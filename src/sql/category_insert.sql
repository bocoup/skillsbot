INSERT INTO skill_category (
  name,
  slack_team_id,
  is_active
)
VALUES (
  ${name},
  (SELECT id FROM slack_team WHERE token = ${token}),
  ${isActive} 
)

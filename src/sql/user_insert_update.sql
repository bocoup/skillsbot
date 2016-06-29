INSERT INTO slack_user (
  slack_id,
  slack_team_id,
  is_active,
  meta
)
VALUES (
  ${userId},
  (SELECT id FROM slack_team WHERE token = ${token}),
  ${isActive},
  ${meta}
)
ON CONFLICT (slack_id)
DO UPDATE SET (
  slack_team_id,
  is_active,
  meta
) = (
  (SELECT id FROM slack_team WHERE token = ${token}),
  ${isActive},
  ${meta}
)

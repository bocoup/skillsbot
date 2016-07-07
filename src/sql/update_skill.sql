INSERT INTO skill_slack_user_log (
  slack_user_id,
  skill_id,
  interest_scale_id,
  experience_scale_id,
  reason
) VALUES (
  (SELECT id FROM slack_user WHERE slack_id = ${userId}),
  ${skillId},
  (SELECT id FROM interest_scale WHERE ranking = ${interest}),
  (SELECT id FROM experience_scale WHERE ranking = ${experience}),
  ${reason}
)

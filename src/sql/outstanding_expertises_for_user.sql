SELECT
  exp.id,
  exp.name,
  exp.description,
  (SELECT name FROM expertise_category WHERE id = expertise_category_id) AS category
FROM slack_user usr, expertise exp
WHERE usr.slack_id = ${userId}
AND exp.description IS NOT NULL
AND (
  SELECT count(*)
  FROM expertise_slack_user_log log
  WHERE log.slack_user_id = usr.id AND log.expertise_id = exp.id
) = 0

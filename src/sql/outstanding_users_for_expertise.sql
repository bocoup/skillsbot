SELECT
  ARRAY_AGG(usr.slack_id) AS users
FROM slack_user usr, expertise exp
WHERE exp.id = ${expertiseId}
AND (
  SELECT count(*)
  FROM expertise_slack_user_log log
  WHERE log.slack_user_id = usr.id AND log.expertise_id = exp.id
) = 0

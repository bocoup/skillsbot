SELECT
  ARRAY_AGG(usr.slack_id) AS users
FROM slack_user usr, expertise exp
WHERE exp.id = ${expertiseId}
AND (
  SELECT COUNT(*)
  FROM expertise_current cur
  WHERE cur.slack_user_id = usr.id AND cur.expertise_id = exp.id
) = 0

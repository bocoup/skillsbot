SELECT
  exp.id,
  exp.name,
  exp.description,
  cat.name AS category
FROM slack_user usr, expertise exp
INNER JOIN expertise_category cat ON (cat.id = exp.expertise_category_id)
WHERE usr.is_active = true AND usr.slack_id = ${userId}
AND exp.description IS NOT NULL
AND (
  SELECT COUNT(*)
  FROM expertise_current cur
  WHERE cur.slack_user_id = usr.id AND cur.expertise_id = exp.id
) = 0

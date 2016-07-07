SELECT
  sk.id,
  sk.name,
  sk.description,
  cat.name AS category
FROM slack_user usr, skill sk
INNER JOIN skill_category cat ON (cat.id = sk.skill_category_id)
WHERE usr.is_active = true AND usr.slack_id = ${userId}
AND sk.description IS NOT NULL
AND (
  SELECT COUNT(*)
  FROM skill_current cur
  WHERE cur.slack_user_id = usr.id AND cur.skill_id = sk.id
) = 0

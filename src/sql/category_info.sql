SELECT
  cat.id,
  cat.name,
  cat.is_active,
  ARRAY_AGG(sk.name ORDER BY sk.name) AS skills
FROM skill_category cat
INNER JOIN skill sk ON (sk.skill_category_id = cat.id)
WHERE cat.id = ${categoryId}
GROUP BY cat.id, cat.name, cat.is_active

WITH categories AS (
  SELECT
    cat.name,
    COUNT(sk) AS skills_count,
    cat.is_active
  FROM skill_category cat
  INNER JOIN slack_team team ON (team.id = cat.slack_team_id)
  LEFT JOIN skill sk ON (sk.skill_category_id = cat.id)
  WHERE team.token = ${token}
  GROUP BY cat.name, cat.is_active
  ORDER BY cat.name
)
SELECT
  (SELECT COALESCE(ARRAY_AGG(ARRAY[name, skills_count::text]), '{}') FROM categories WHERE is_active = true) AS active,
  (SELECT COALESCE(ARRAY_AGG(ARRAY[name, skills_count::text]), '{}') FROM categories WHERE is_active = false) AS inactive

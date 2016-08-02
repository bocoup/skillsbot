WITH skills_categories AS (
  SELECT
    sk.name AS skill,
    cat.name AS name,
    cat.is_active AS category_is_active
  FROM skill sk
  INNER JOIN skill_category cat ON (sk.skill_category_id = cat.id)
  INNER JOIN slack_team team ON (cat.slack_team_id = team.id)
  WHERE team.token = ${token}
  AND cat.parent_id IS NULL
)
SELECT name, skills FROM (
  (
    SELECT
      name,
      1 AS sort,
      ARRAY_AGG(skill ORDER BY skill) AS skills
    FROM skills_categories
    WHERE category_is_active = true
    GROUP BY name
  ) UNION (
    SELECT
      'Uncategorized' AS name,
      2 AS sort,
      ARRAY_AGG(skill ORDER BY skill) AS skills
    FROM skills_categories
    WHERE category_is_active = false
    HAVING COUNT(*) > 1
  )
  ORDER BY sort, name
) tbl

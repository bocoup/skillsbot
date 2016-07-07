WITH skill_ranking AS (
  SELECT
    interest_scale_id,
    experience_scale_id
  FROM skill_current
  WHERE skill_id = ${skillId}
), interest_count AS ( 
  SELECT
    ranking::numeric,
    COUNT(r) AS count
  FROM interest_scale int
  LEFT JOIN skill_ranking r ON (r.interest_scale_id = int.id)
  GROUP BY ranking
  ORDER BY ranking
), experience_count AS ( 
  SELECT
    ranking::numeric,
    COUNT(r) AS count
  FROM experience_scale exp
  LEFT JOIN skill_ranking r ON (r.experience_scale_id = exp.id)
  GROUP BY ranking
  ORDER BY ranking
)
SELECT
  (SELECT ARRAY_AGG(ARRAY[ranking, count]) FROM interest_count) AS interest,
  (SELECT ARRAY_AGG(ARRAY[ranking, count]) FROM experience_count) AS experience

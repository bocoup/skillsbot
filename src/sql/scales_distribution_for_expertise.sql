WITH expertise_ranking AS (
  SELECT
    interest_scale_id,
    experience_scale_id
  FROM expertise_current
  WHERE expertise_id = ${expertiseId}
), interest_count AS ( 
  SELECT
    ranking::numeric,
    COUNT(r) AS count
  FROM interest_scale i_scale
  LEFT JOIN expertise_ranking r ON (r.interest_scale_id = i_scale.id)
  GROUP BY ranking
  ORDER BY ranking
), experience_count AS ( 
  SELECT
    ranking::numeric,
    COUNT(r) AS count
  FROM experience_scale e_scale
  LEFT JOIN expertise_ranking r ON (r.experience_scale_id = e_scale.id)
  GROUP BY ranking
  ORDER BY ranking
)
SELECT
  (SELECT ARRAY_AGG(ARRAY[ranking, count]) FROM interest_count) AS interest,
  (SELECT ARRAY_AGG(ARRAY[ranking, count]) FROM experience_count) AS experience

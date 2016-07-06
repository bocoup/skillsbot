SELECT
  (SELECT ARRAY_AGG(ARRAY[ranking::text, description] ORDER BY ranking) FROM interest_scale) AS interest,
  (SELECT ARRAY_AGG(ARRAY[ranking::text, description] ORDER BY ranking) FROM experience_scale) AS experience

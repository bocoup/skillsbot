SELECT 'interest' AS type, description, ranking FROM interest_scale
UNION ALL
SELECT 'experience' AS type, description, ranking FROM experience_scale
ORDER BY type, ranking

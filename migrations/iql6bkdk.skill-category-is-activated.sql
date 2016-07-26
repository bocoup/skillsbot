ALTER TABLE skill ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE skill_category ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
---
ALTER TABLE skill DROP COLUMN is_active;
ALTER TABLE skill_category DROP COLUMN is_active;

-- ============================================================
-- Clann — Step: link meal_plans to recipes
-- ============================================================

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

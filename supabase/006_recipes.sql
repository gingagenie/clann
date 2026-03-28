-- ============================================================
-- Clann — Step: recipes + recipe_ingredients tables
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household recipes"
  ON recipes FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "Members can update recipes"
  ON recipes FOR UPDATE
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can delete recipes"
  ON recipes FOR DELETE
  USING (household_id = get_my_household_id());

CREATE INDEX IF NOT EXISTS recipes_household_id_idx
  ON recipes (household_id);

-- ── Ingredients ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE household_id = get_my_household_id()
    )
  );

CREATE POLICY "Members can insert recipe ingredients"
  ON recipe_ingredients FOR INSERT
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes WHERE household_id = get_my_household_id()
    )
  );

CREATE POLICY "Members can update recipe ingredients"
  ON recipe_ingredients FOR UPDATE
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE household_id = get_my_household_id()
    )
  );

CREATE POLICY "Members can delete recipe ingredients"
  ON recipe_ingredients FOR DELETE
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE household_id = get_my_household_id()
    )
  );

CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_id_idx
  ON recipe_ingredients (recipe_id);

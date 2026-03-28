-- ============================================================
-- Clann — Step: meal_plans table
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  title        TEXT NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, date)
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household meal plans"
  ON meal_plans FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can insert meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "Members can update meal plans"
  ON meal_plans FOR UPDATE
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can delete meal plans"
  ON meal_plans FOR DELETE
  USING (household_id = get_my_household_id());

CREATE INDEX IF NOT EXISTS meal_plans_household_date_idx
  ON meal_plans (household_id, date);

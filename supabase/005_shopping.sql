-- ============================================================
-- Clann — Step: shopping_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  quantity     TEXT,
  checked      BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household shopping items"
  ON shopping_items FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can insert shopping items"
  ON shopping_items FOR INSERT
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "Members can update shopping items"
  ON shopping_items FOR UPDATE
  USING (household_id = get_my_household_id());

CREATE POLICY "Members can delete shopping items"
  ON shopping_items FOR DELETE
  USING (household_id = get_my_household_id());

CREATE INDEX IF NOT EXISTS shopping_items_household_id_idx
  ON shopping_items (household_id);

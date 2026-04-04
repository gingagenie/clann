CREATE TABLE IF NOT EXISTS chores (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id     UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  child_member_id  UUID REFERENCES members(id)    ON DELETE CASCADE NOT NULL,
  name             TEXT NOT NULL,
  repeat           TEXT NOT NULL DEFAULT 'daily' CHECK (repeat IN ('daily', 'weekly')),
  days_of_week     TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chore_completions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chore_id       UUID REFERENCES chores(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE NOT NULL,
  UNIQUE(chore_id, completed_date)
);

ALTER TABLE chores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can manage chores"
  ON chores FOR ALL
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "household members can manage chore completions"
  ON chore_completions FOR ALL
  USING (
    chore_id IN (SELECT id FROM chores WHERE household_id = get_my_household_id())
  )
  WITH CHECK (
    chore_id IN (SELECT id FROM chores WHERE household_id = get_my_household_id())
  );

-- ============================================================
-- Clann — Step 2: households + members tables
-- Run this in the Supabase SQL editor
-- ============================================================

-- households
CREATE TABLE IF NOT EXISTS households (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  week_start_day  TEXT NOT NULL DEFAULT 'monday' CHECK (week_start_day IN ('monday', 'sunday')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- members
CREATE TABLE IF NOT EXISTS members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  email              TEXT,
  role               TEXT NOT NULL DEFAULT 'adult' CHECK (role IN ('adult', 'child')),
  age_bracket        TEXT CHECK (age_bracket IN ('under5', '5to12', 'teen', 'adult')),
  portion_multiplier FLOAT NOT NULL DEFAULT 1.0,
  is_primary         BOOLEAN NOT NULL DEFAULT FALSE,
  auth_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members    ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user in a given household?
-- (used in policies below)

-- households policies
CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update their household"
  ON households FOR UPDATE
  USING (
    id IN (SELECT household_id FROM members WHERE auth_user_id = auth.uid())
  );

-- members policies
CREATE POLICY "Members can view household members"
  ON members FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM members m WHERE m.auth_user_id = auth.uid())
  );

-- INSERT: allow inserting yourself (bootstrapping Adult 1) OR
--         inserting others once you're already in the household
CREATE POLICY "Members can insert into their household"
  ON members FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    OR household_id IN (
      SELECT household_id FROM members m WHERE m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update household members"
  ON members FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM members m WHERE m.auth_user_id = auth.uid())
  );

CREATE POLICY "Members can delete household members"
  ON members FOR DELETE
  USING (
    household_id IN (SELECT household_id FROM members m WHERE m.auth_user_id = auth.uid())
  );

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS members_auth_user_id_idx ON members (auth_user_id);
CREATE INDEX IF NOT EXISTS members_household_id_idx ON members (household_id);

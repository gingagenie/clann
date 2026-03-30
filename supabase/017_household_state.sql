-- Add Australian state/territory to households
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS state TEXT
    CHECK (state IN ('VIC','NSW','QLD','SA','WA','TAS','ACT','NT'));

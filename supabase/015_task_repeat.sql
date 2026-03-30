-- Add repeat type to recurring_tasks
ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS repeat       TEXT    NOT NULL DEFAULT 'weekly'
                           CHECK (repeat IN ('weekly', 'monthly', 'one_off')),
  ADD COLUMN IF NOT EXISTS one_off_date DATE,        -- used when repeat = 'one_off'
  ADD COLUMN IF NOT EXISTS day_of_month INTEGER      -- used when repeat = 'monthly' (1-28)
                           CHECK (day_of_month BETWEEN 1 AND 28);

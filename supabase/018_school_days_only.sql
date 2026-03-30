-- Add school_days_only flag to recurring_tasks
-- When true, the task is skipped on school holiday dates
ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS school_days_only BOOLEAN NOT NULL DEFAULT false;

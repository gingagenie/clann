-- Track when a task reminder was last sent to prevent duplicate pushes
-- when the cron runs multiple times per day.
ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS reminder_last_sent DATE;

-- Add category to shopping items
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

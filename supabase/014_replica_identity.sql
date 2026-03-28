-- Required for Supabase Realtime DELETE events to include household_id,
-- so RLS can verify the subscriber's access and broadcast the event.
ALTER TABLE shopping_items REPLICA IDENTITY FULL;

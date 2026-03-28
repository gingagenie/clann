-- ============================================================
-- Clann — Step: join_code on households + join RPC
-- ============================================================

-- Add join_code column
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- RPC: lets a signed-in user join a household by code.
-- SECURITY DEFINER bypasses RLS so the caller doesn't need
-- prior household membership to look up the household or
-- update the unlinked member row.
CREATE OR REPLACE FUNCTION join_household_by_code(code TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_household_id UUID;
  v_member_id    UUID;
BEGIN
  -- 1. Find the household
  SELECT id INTO v_household_id
  FROM households
  WHERE join_code = UPPER(TRIM(code));

  IF v_household_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid join code — double-check it and try again.');
  END IF;

  -- 2. Caller must not already belong to a household
  IF get_my_household_id() IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'You are already linked to a household.');
  END IF;

  -- 3. Find an unlinked adult slot in that household
  SELECT id INTO v_member_id
  FROM members
  WHERE household_id = v_household_id
    AND auth_user_id IS NULL
    AND role = 'adult'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object(
      'error',
      'No available slot in this household. Ask the household admin to add you in Settings first.'
    );
  END IF;

  -- 4. Link the caller to that member row
  UPDATE members
  SET auth_user_id = auth.uid()
  WHERE id = v_member_id;

  RETURN jsonb_build_object('success', true, 'household_id', v_household_id);
END;
$$;

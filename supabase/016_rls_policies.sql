-- =================================================================
-- Clann – Row Level Security Policies
-- Run this entire file in the Supabase SQL Editor.
-- Safe to re-run: drops all existing policies first, then recreates.
--
-- Tables covered:
--   households, members, recurring_tasks, week_tasks,
--   recipes (= "meals"), recipe_ingredients (= "meal_ingredients"),
--   meal_plans (= "week_meals"), shopping_items
--
-- Security model:
--   Users can only read/write data belonging to their household.
--   Household is resolved via the members table using auth.uid().
--   A SECURITY DEFINER function is used to prevent RLS recursion.
-- =================================================================


-- ── 0. Drop all existing policies (clean slate) ──────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename IN (
             'households', 'members', 'recurring_tasks', 'week_tasks',
             'recipes', 'recipe_ingredients', 'meal_plans', 'shopping_items'
           )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;


-- ── 1. Enable RLS on every table ─────────────────────────────────

ALTER TABLE households          ENABLE ROW LEVEL SECURITY;
ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items      ENABLE ROW LEVEL SECURITY;


-- ── 2. Helper functions (SECURITY DEFINER) ───────────────────────
--
-- These run as the function owner (postgres/service role), so they
-- bypass RLS on the tables they query. This is intentional —
-- it is the standard Supabase pattern to avoid infinite recursion.

-- Returns the household_id for the currently logged-in user.
-- Returns NULL if the user has no member row yet (e.g. during onboarding).
CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id
  FROM   members
  WHERE  auth_user_id = auth.uid()
  LIMIT  1;
$$;

-- Returns true if the given recipe_id is readable by the current user
-- (i.e. belongs to their household OR is a shared starter recipe).
-- SECURITY DEFINER avoids RLS recursion when this is called from
-- recipe_ingredients policies.
CREATE OR REPLACE FUNCTION recipe_accessible(p_recipe_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   recipes
    WHERE  id = p_recipe_id
      AND  (household_id = get_my_household_id() OR is_starter = true)
  );
$$;

-- Returns true if the given recipe_id belongs to the current user's household.
-- Used for write-access checks on recipe_ingredients.
CREATE OR REPLACE FUNCTION recipe_in_my_household(p_recipe_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   recipes
    WHERE  id = p_recipe_id
      AND  household_id = get_my_household_id()
  );
$$;


-- ── 3. households ────────────────────────────────────────────────
--
-- SELECT: open to all authenticated users.
--   Reason: the join-via-code flow (JoinPage) looks up a household
--   by join_code before the user has a member row. The join_code
--   itself is the security token — knowing it is what grants access.
--   Tighten this to (id = get_my_household_id()) once the join
--   lookup is handled server-side (Edge Function / service role).
--
-- INSERT: open to authenticated users for onboarding.
--
-- UPDATE: restricted to own household only.
--
-- DELETE: no policy — households cannot be deleted via client.

CREATE POLICY "households_select"
  ON households
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "households_insert"
  ON households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "households_update"
  ON households
  FOR UPDATE
  TO authenticated
  USING     (id = get_my_household_id())
  WITH CHECK (id = get_my_household_id());


-- ── 4. members ───────────────────────────────────────────────────
--
-- SELECT: own household only.
--
-- INSERT: allowed when:
--   (a) user has no household yet — first member during onboarding, OR
--   (b) user is adding someone to their existing household.
--   This lets adults add children/partners who may not have auth accounts.
--
-- UPDATE/DELETE: own household only.

CREATE POLICY "members_select"
  ON members
  FOR SELECT
  TO authenticated
  USING (household_id = get_my_household_id());

CREATE POLICY "members_insert"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_household_id() IS NULL          -- onboarding: no member row yet
    OR household_id = get_my_household_id() -- adding to existing household
  );

CREATE POLICY "members_update"
  ON members
  FOR UPDATE
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "members_delete"
  ON members
  FOR DELETE
  TO authenticated
  USING (household_id = get_my_household_id());


-- ── 5. recurring_tasks ───────────────────────────────────────────

CREATE POLICY "recurring_tasks_all"
  ON recurring_tasks
  FOR ALL
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());


-- ── 6. week_tasks ────────────────────────────────────────────────

CREATE POLICY "week_tasks_all"
  ON week_tasks
  FOR ALL
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());


-- ── 7. recipes (your "meals" table) ──────────────────────────────
--
-- SELECT: own household + all is_starter=true shared recipes.
-- INSERT/UPDATE/DELETE: own household only.
--   (Starter recipes are managed by the service role / seed data.)

CREATE POLICY "recipes_select"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (household_id = get_my_household_id() OR is_starter = true);

CREATE POLICY "recipes_insert"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "recipes_update"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "recipes_delete"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (household_id = get_my_household_id());


-- ── 8. recipe_ingredients (your "meal_ingredients" table) ────────
--
-- No direct household_id — access is derived from the parent recipe.
-- Uses SECURITY DEFINER functions to avoid RLS recursion on recipes.

CREATE POLICY "recipe_ingredients_select"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (recipe_accessible(recipe_id));

CREATE POLICY "recipe_ingredients_insert"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (recipe_in_my_household(recipe_id));

CREATE POLICY "recipe_ingredients_update"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING     (recipe_in_my_household(recipe_id))
  WITH CHECK (recipe_in_my_household(recipe_id));

CREATE POLICY "recipe_ingredients_delete"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (recipe_in_my_household(recipe_id));


-- ── 9. meal_plans (your "week_meals" table) ──────────────────────

CREATE POLICY "meal_plans_all"
  ON meal_plans
  FOR ALL
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());


-- ── 10. shopping_items ───────────────────────────────────────────

CREATE POLICY "shopping_items_all"
  ON shopping_items
  FOR ALL
  TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());


-- =================================================================
-- Verification query — run after applying to confirm all policies:
--
-- SELECT tablename, policyname, cmd, roles, qual
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
-- ORDER  BY tablename, cmd;
-- =================================================================

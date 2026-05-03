/*
  # Fix Security Issues

  ## Summary
  Addresses all security advisories raised by the Supabase security scanner.

  ## Changes

  ### 1. Drop Unused Index
  - Removes `idx_sessions_date` on `public.sessions` — this index has never been used
    and adds unnecessary write overhead.

  ### 2. Consolidate Multiple Permissive Policies (profiles)
  - Drops the separate "Users can read own profile" and "Admin can read all profiles"
    SELECT policies and replaces them with a single unified policy.
  - Drops the separate "Users can update own profile" and "Admin can update all profiles"
    UPDATE policies and replaces them with a single unified policy.
  - A single permissive policy per action prevents Postgres from running both checks
    and OR-ing the results, which is the root cause of the multiple-permissive-policy warning.

  ### 3. Consolidate Multiple Permissive Policies (sessions)
  - Drops the "Admins have full access to sessions" FOR ALL policy and the four
    individual athlete policies (SELECT, INSERT, UPDATE, DELETE).
  - Replaces them with four unified policies — one per action — each of which
    grants access to either the owning athlete or the admin email.

  ### 4. Fix Mutable Search Path on handle_updated_at
  - Adds `SET search_path = public` to `handle_updated_at` so the function
    always resolves objects in the expected schema and is not vulnerable to
    search-path injection.

  ## Notes
  - Auth DB Connection Strategy (percentage-based) and Leaked Password Protection
    must be enabled from the Supabase Dashboard → Project Settings → Auth.
    These cannot be changed via SQL migrations.
*/

-- ============================================================================
-- 1. DROP UNUSED INDEX
-- ============================================================================

DROP INDEX IF EXISTS idx_sessions_date;

-- ============================================================================
-- 2. PROFILES — consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

CREATE POLICY "Users and admin can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

-- ============================================================================
-- 3. PROFILES — consolidate UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

CREATE POLICY "Users and admin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  )
  WITH CHECK (
    (select auth.uid()) = id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

-- ============================================================================
-- 4. SESSIONS — drop all overlapping policies
-- ============================================================================

DROP POLICY IF EXISTS "Athletes can read own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can delete own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins have full access to sessions" ON sessions;

-- ============================================================================
-- 5. SESSIONS — create unified policies (one per action)
-- ============================================================================

CREATE POLICY "Athletes and admin can read sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = athlete_id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

CREATE POLICY "Athletes and admin can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = (select auth.uid())
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

CREATE POLICY "Athletes and admin can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = athlete_id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  )
  WITH CHECK (
    athlete_id = (select auth.uid())
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

CREATE POLICY "Athletes and admin can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = athlete_id
    OR (select auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

-- ============================================================================
-- 6. FIX MUTABLE SEARCH PATH on handle_updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

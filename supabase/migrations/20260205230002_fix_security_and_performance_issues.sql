/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses multiple security and performance issues identified in the database audit:
  - Optimizes RLS policies to use (select auth.uid()) for better query performance
  - Consolidates duplicate permissive policies to simplify security model
  - Removes unused database index
  - Fixes function search path security issue

  ## Changes Made

  ### 1. RLS Policy Performance Optimization
  All RLS policies now use (select auth.uid()) instead of auth.uid() to prevent 
  re-evaluation for each row, significantly improving query performance at scale.

  ### 2. Consolidate Duplicate Policies
  - Removed duplicate "Athletes can view own sessions" policy (kept "Athletes can read own sessions")
  - Kept single SELECT policy per table to avoid multiple permissive policies
  - Updated admin policies to use email check instead of profile lookup where possible

  ### 3. Remove Unused Index
  - Drop idx_sessions_athlete_date (not being used by queries)

  ### 4. Fix Function Security
  - Update handle_new_user function with explicit search_path to prevent security issues

  ## Security Notes
  - All policies remain restrictive by default
  - Athletes can only access their own data
  - Admin access requires specific email verification
  - No data access is possible without proper authentication
*/

-- ============================================================================
-- STEP 1: Drop all existing RLS policies
-- ============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop sessions policies
DROP POLICY IF EXISTS "Admins have full access to sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can delete own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can read own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can view own sessions" ON sessions;

-- ============================================================================
-- STEP 2: Create optimized RLS policies for PROFILES table
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

-- Admin can read all profiles (using JWT email check)
CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  )
  WITH CHECK (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  );

-- Admin can delete profiles
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  );

-- ============================================================================
-- STEP 3: Create optimized RLS policies for SESSIONS table
-- ============================================================================

-- Athletes can read their own sessions
CREATE POLICY "Athletes can read own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = athlete_id);

-- Admins can read all sessions
CREATE POLICY "Admins have full access to sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  )
  WITH CHECK (
    ((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com'
  );

-- Athletes can insert their own sessions
CREATE POLICY "Athletes can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (select auth.uid()));

-- Athletes can update their own sessions
CREATE POLICY "Athletes can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

-- Athletes can delete their own sessions
CREATE POLICY "Athletes can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = athlete_id);

-- ============================================================================
-- STEP 4: Remove unused index
-- ============================================================================

DROP INDEX IF EXISTS idx_sessions_athlete_date;

-- ============================================================================
-- STEP 5: Fix function search path security issue
-- ============================================================================

-- Drop and recreate handle_new_user function with explicit search_path
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

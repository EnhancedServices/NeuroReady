/*
  # Create Full Application Schema

  ## Summary
  This is the initial schema setup for the Athlete Readiness application.
  It creates all required tables, triggers, RLS policies, and indexes.

  ## New Tables

  ### profiles
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text)
  - `role` (text, default 'athlete', constrained to ['athlete', 'admin'])
  - `timezone` (text, default 'UTC')
  - `onboarding_complete` (boolean, default false)
  - `baseline_sessions_count` (int, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### sessions
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles.id)
  - `date` (date, not null)
  - `time_of_day` (text)
  - All cognitive test metrics (stroop, switch, pvt)
  - Context fields (sleep_hours, hard_training_24h, illness_symptoms, travel)
  - `is_baseline` (boolean, default false)
  - `test_quality_flag` (boolean, default false)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Athletes can only access their own data
  - Admin (identified by email via JWT) has full access to all data
  - Trigger auto-creates profile on user signup

  ## Important Notes
  - Only enhanced.services.au@gmail.com can hold the admin role (enforced by DB constraint)
  - Profile is auto-created by trigger on auth.users insert
  - All RLS policies use (select auth.uid()) for performance
*/

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'athlete',
  timezone text NOT NULL DEFAULT 'UTC',
  onboarding_complete boolean NOT NULL DEFAULT false,
  baseline_sessions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role IN ('athlete', 'admin')),
  CONSTRAINT profiles_admin_email_check CHECK (
    role = 'athlete' OR
    (role = 'admin' AND email = 'enhanced.services.au@gmail.com')
  )
);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_of_day text,
  stroop_interference_ms numeric,
  stroop_errors integer,
  switch_cost_ms numeric,
  switch_errors integer,
  pvt_median_rt_ms numeric,
  pvt_lapses integer,
  pvt_false_starts integer,
  sleep_hours numeric,
  hard_training_24h boolean,
  illness_symptoms boolean,
  travel boolean,
  is_baseline boolean NOT NULL DEFAULT false,
  test_quality_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_athlete_id ON sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);

-- ============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    CASE WHEN new.email = 'enhanced.services.au@gmail.com' THEN 'admin' ELSE 'athlete' END
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- PROFILES policies

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com')
  WITH CHECK (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com');

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com');

-- SESSIONS policies

CREATE POLICY "Athletes can read own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Athletes can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (select auth.uid()));

CREATE POLICY "Athletes can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

CREATE POLICY "Athletes can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Admins have full access to sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com')
  WITH CHECK (((select auth.jwt())->>'email') = 'enhanced.services.au@gmail.com');

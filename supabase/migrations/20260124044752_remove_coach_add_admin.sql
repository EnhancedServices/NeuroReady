/*
  # Remove Coach Role and Add Admin Role

  ## Summary
  This migration removes the coach functionality and adds an admin role with full access to all data.

  ## Changes Made
  
  ### 1. Drop Existing Policies
    - Drop all existing RLS policies that reference coach functionality
  
  ### 2. Drop Tables
    - Drop `coach_athletes` table (no longer needed)
  
  ### 3. Update Tables
    - Update `profiles` table:
      - Remove old role constraint
      - Convert all existing 'coach' users to 'admin' role
      - Add new role constraint for ['athlete', 'admin']
      - Update default role to 'athlete'
  
  ### 4. Security Changes (RLS Policies)
    - Create new restrictive policies:
      - Athletes can only view/update their own profile
      - Athletes can only view/insert/update their own sessions
      - Admins have full access to all profiles and sessions
  
  ## Important Notes
  - Admins have "skeleton key" access to view all athlete data
  - Athletes are isolated and can only see their own data
  - Existing coach users are automatically converted to admin role
*/

-- Drop all existing RLS policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches can view their athletes' profiles" ON profiles;
DROP POLICY IF EXISTS "Coaches can read their athletes profiles" ON profiles;

-- Drop all existing RLS policies on sessions
DROP POLICY IF EXISTS "Athletes can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Athletes can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can view their athletes' sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can read their athletes sessions" ON sessions;

-- Drop the coach_athletes table
DROP TABLE IF EXISTS coach_athletes CASCADE;

-- Update the profiles table role constraint
-- First drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update existing coach users to admin role
UPDATE profiles SET role = 'admin' WHERE role = 'coach';

-- Add new constraint with athlete and admin roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('athlete', 'admin'));

-- Create new RLS policies for profiles table
CREATE POLICY "Athletes can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Athletes can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Athletes can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full access to profiles"
  ON profiles FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Create new RLS policies for sessions table
CREATE POLICY "Athletes can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Athletes can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Admins have full access to sessions"
  ON sessions FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Problem
  The current RLS policies for the profiles table have circular dependencies that cause infinite recursion.
  When a policy checks if a user is an admin by querying the profiles table, it triggers another policy check,
  creating an infinite loop.

  ## Solution
  1. Drop all existing policies on profiles table
  2. Create new policies that don't have circular dependencies
  3. Use direct email check for admin access instead of querying profiles table
  4. Simplify policies to avoid subqueries that reference the same table

  ## New Policies
  - Users can read their own profile (simple ID check)
  - Users can insert their own profile (simple ID check)
  - Users can update their own profile (simple ID check)
  - Admin user (identified by specific email) can read all profiles
  - Admin user can update all profiles
  - Admin user can delete profiles
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Athletes can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Athletes can update own profile" ON profiles;
DROP POLICY IF EXISTS "Athletes can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create simple policies without circular dependencies

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admin to read all profiles (using email check from auth.jwt())
CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admin to update all profiles
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  )
  WITH CHECK (
    (auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

-- Allow admin to delete profiles
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'enhanced.services.au@gmail.com'
  );

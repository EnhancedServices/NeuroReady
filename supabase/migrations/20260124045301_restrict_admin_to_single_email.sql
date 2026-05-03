/*
  # Restrict Admin Role to Single Email

  ## Summary
  This migration ensures only one specific email address can have admin privileges.

  ## Changes Made
  
  ### 1. Add Check Constraint
    - Add constraint to profiles table that ensures only 'enhanced.services.au@gmail.com' can have admin role
    - All other users must be athletes
  
  ### 2. Security
    - Database-level enforcement prevents accidental or malicious admin assignment
    - This constraint cannot be bypassed by application code
  
  ## Important Notes
  - Only enhanced.services.au@gmail.com can be an admin
  - Attempting to set any other user as admin will fail with a constraint violation
  - This is enforced at the database level for maximum security
*/

-- Add check constraint to ensure only the specified email can be admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_admin_email_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_admin_email_check 
  CHECK (
    role = 'athlete' OR 
    (role = 'admin' AND email = 'enhanced.services.au@gmail.com')
  );
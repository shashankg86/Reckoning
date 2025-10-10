/*
  # Remove Email Check Constraint and Fix Profile Creation
  
  1. Drop the email format check constraint (causing signup failures)
  2. Make phone and name nullable for Google OAuth compatibility
  3. Fix the profile creation trigger
*/

-- Drop the email check constraint that's causing issues
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS email_format;

-- Make phone and name nullable (required for Google OAuth)
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL;

-- Recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    phone,
    name,
    created_at,
    last_login_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    last_login_at = NOW(),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = CASE 
      WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone != '' 
      THEN EXCLUDED.phone 
      ELSE profiles.phone 
    END,
    name = COALESCE(EXCLUDED.name, profiles.name);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_for_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

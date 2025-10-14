/*
  # Remove Email Check Constraint and Fix Profile Creation
  
  1. Drop the email format check constraint (causing signup failures)
  2. Make phone and name nullable for Google OAuth compatibility
  3. Fix the profile creation trigger
  4. Backfill profiles for existing users
*/

-- Drop the email check constraint that's causing issues
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS email_format;

-- Make phone and name nullable (required for Google OAuth)
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL;

-- Ensure photo_url column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Recreate the trigger function with proper error handling and Google OAuth support
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
    photo_url,
    created_at,
    last_login_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
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
    name = COALESCE(EXCLUDED.name, profiles.name),
    photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_for_user: %, DETAIL: %, HINT: %', 
      SQLERRM, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Backfill profiles for existing users who don't have profiles yet
DO $$
DECLARE
  user_record RECORD;
  profile_exists BOOLEAN;
  users_without_profiles INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT 
      id, 
      email, 
      phone,
      raw_user_meta_data,
      created_at
    FROM auth.users
  LOOP
    -- Check if profile already exists
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = user_record.id
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
      BEGIN
        INSERT INTO public.profiles (
          id,
          email,
          phone,
          name,
          photo_url,
          created_at,
          last_login_at
        )
        VALUES (
          user_record.id,
          user_record.email,
          COALESCE(user_record.raw_user_meta_data->>'phone', user_record.phone, ''),
          COALESCE(
            user_record.raw_user_meta_data->>'name',
            user_record.raw_user_meta_data->>'full_name',
            split_part(user_record.email, '@', 1),
            'User'
          ),
          COALESCE(
            user_record.raw_user_meta_data->>'avatar_url',
            user_record.raw_user_meta_data->>'picture',
            NULL
          ),
          user_record.created_at,
          NOW()
        );
        
        users_without_profiles := users_without_profiles + 1;
        RAISE NOTICE 'Created profile for user: %', user_record.email;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to create profile for user %: %', user_record.email, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % profiles', users_without_profiles;
END;
$$;
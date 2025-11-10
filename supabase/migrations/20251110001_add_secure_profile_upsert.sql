-- ============================================================================
-- Migration: Add Secure Profile Upsert Function
-- Version: 1.0.0
-- Date: 2025-11-10
-- Description: Creates a SECURITY DEFINER function to upsert profiles,
--              bypassing RLS policies to fix email verification hang issue
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, TEXT, TEXT);

-- Create secure function to upsert profile
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Security check: Only allow users to upsert their own profile
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot upsert profile for different user';
  END IF;

  -- Upsert the profile (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.profiles (
    id,
    email,
    name,
    phone,
    last_login_at
  )
  VALUES (
    p_user_id,
    LOWER(p_email),
    COALESCE(p_name, split_part(p_email, '@', 1), 'User'),
    COALESCE(p_phone, ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = CASE
      WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone != ''
      THEN EXCLUDED.phone
      ELSE profiles.phone
    END,
    last_login_at = NOW()
  RETURNING * INTO v_profile;

  -- Return profile as JSON
  RETURN jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'name', v_profile.name,
    'phone', v_profile.phone,
    'photo_url', v_profile.photo_url,
    'created_at', v_profile.created_at,
    'last_login_at', v_profile.last_login_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in upsert_user_profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.upsert_user_profile IS
'Securely upserts a user profile, bypassing RLS. Used during email verification when session propagation causes auth.uid() timing issues.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

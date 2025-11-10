-- ============================================================================
-- Migration: Add RLS Policies for Profiles Table
-- Version: 1.0.0
-- Date: 2025-11-10
-- Description: Adds Row Level Security policies to allow authenticated users
--              to manage their own profiles during email verification flow
-- ============================================================================

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 1: DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;

-- ============================================================================
-- SECTION 2: CREATE NEW POLICIES
-- ============================================================================

-- Policy: Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Allow users to insert their own profile during signup/verification
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Service role full access (for admin operations)
CREATE POLICY "Service role has full access to profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECTION 3: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own profile" ON public.profiles
IS 'Allows authenticated users to view their own profile data';

COMMENT ON POLICY "Users can insert own profile" ON public.profiles
IS 'Allows authenticated users to create their own profile during signup/email verification';

COMMENT ON POLICY "Users can update own profile" ON public.profiles
IS 'Allows authenticated users to update their own profile data';

COMMENT ON POLICY "Service role has full access to profiles" ON public.profiles
IS 'Allows service role full access for admin operations and triggers';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

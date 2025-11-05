-- ============================================================================
-- Migration: Fix Profile Creation Trigger
-- Version: 1.0.0
-- Author: Claude
-- Date: 2025-11-05
-- Description: Creates the missing trigger that automatically creates profiles
--              when users sign up via auth.users table
-- Issue: Profile creation was failing because trigger function existed but
--        the trigger itself was never created on auth.users
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP EXISTING TRIGGER IF IT EXISTS (for idempotency)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- SECTION 2: CREATE TRIGGER ON AUTH.USERS
-- ============================================================================

-- This trigger will automatically create a profile whenever a user signs up
-- It fires AFTER INSERT on auth.users and calls the create_profile_for_user() function
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users
IS 'Automatically creates a profile in public.profiles when a user signs up';

-- ============================================================================
-- SECTION 3: VERIFY PROFILES TABLE STRUCTURE
-- ============================================================================

-- Ensure profiles table has the correct primary key
DO $$
BEGIN
    -- Check if profiles table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) THEN
        RAISE NOTICE 'Profiles table exists';

        -- Verify id is primary key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = 'profiles'
            AND constraint_type = 'PRIMARY KEY'
            AND constraint_name LIKE '%pkey%'
        ) THEN
            RAISE EXCEPTION 'profiles table is missing primary key on id column';
        END IF;

        RAISE NOTICE 'Profiles table structure is valid';
    ELSE
        RAISE EXCEPTION 'profiles table does not exist - run initial migrations first';
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Ensure the trigger function can be executed by the auth system
GRANT EXECUTE ON FUNCTION public.create_profile_for_user() TO postgres, service_role;

-- ============================================================================
-- SECTION 5: TEST DATA INTEGRITY
-- ============================================================================

-- Find any auth.users without corresponding profiles (orphaned users)
DO $$
DECLARE
    v_orphaned_count INTEGER;
    v_user_record RECORD;
BEGIN
    -- Count orphaned users
    SELECT COUNT(*) INTO v_orphaned_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

    IF v_orphaned_count > 0 THEN
        RAISE NOTICE 'Found % users without profiles - creating profiles now', v_orphaned_count;

        -- Create profiles for orphaned users
        FOR v_user_record IN
            SELECT u.id, u.email, u.raw_user_meta_data, u.created_at, u.email_confirmed_at
            FROM auth.users u
            LEFT JOIN public.profiles p ON u.id = p.id
            WHERE p.id IS NULL
        LOOP
            -- Extract metadata
            DECLARE
                v_provider TEXT;
                v_name TEXT;
                v_phone TEXT;
                v_photo_url TEXT;
                v_email_verified BOOLEAN;
            BEGIN
                v_provider := COALESCE(v_user_record.raw_user_meta_data->>'provider', 'email');
                v_name := COALESCE(
                    v_user_record.raw_user_meta_data->>'name',
                    v_user_record.raw_user_meta_data->>'full_name',
                    split_part(v_user_record.email, '@', 1),
                    'User'
                );
                v_phone := COALESCE(v_user_record.raw_user_meta_data->>'phone', '');
                v_photo_url := COALESCE(
                    v_user_record.raw_user_meta_data->>'avatar_url',
                    v_user_record.raw_user_meta_data->>'picture'
                );
                v_email_verified := (v_provider = 'google' OR v_user_record.email_confirmed_at IS NOT NULL);

                -- Insert profile
                INSERT INTO public.profiles (
                    id,
                    email,
                    name,
                    phone,
                    photo_url,
                    email_verified,
                    email_verified_at,
                    auth_provider,
                    created_at,
                    last_login_at
                )
                VALUES (
                    v_user_record.id,
                    v_user_record.email,
                    v_name,
                    v_phone,
                    v_photo_url,
                    v_email_verified,
                    CASE WHEN v_email_verified THEN COALESCE(v_user_record.email_confirmed_at, v_user_record.created_at) ELSE NULL END,
                    v_provider,
                    v_user_record.created_at,
                    v_user_record.created_at
                )
                ON CONFLICT (id) DO NOTHING;

                RAISE NOTICE 'Created profile for user: % (email: %)', v_user_record.id, v_user_record.email;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create profile for user %: % (SQLSTATE: %)',
                        v_user_record.id, SQLERRM, SQLSTATE;
            END;
        END LOOP;

        RAISE NOTICE 'Finished creating profiles for orphaned users';
    ELSE
        RAISE NOTICE 'No orphaned users found - all users have profiles';
    END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Verification query (run manually to verify trigger is working):
/*
SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name,
    tgenabled AS enabled
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'on_auth_user_created';
*/

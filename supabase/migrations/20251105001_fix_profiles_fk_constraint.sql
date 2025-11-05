-- ============================================================================
-- Migration: Fix Profiles Foreign Key Constraint
-- Version: 1.0.1
-- Author: Claude
-- Date: 2025-11-05
-- Description: Fixes the FK constraint on profiles.id to point to auth.users
--              instead of public.users (which doesn't exist)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CHECK CURRENT FK CONSTRAINT
-- ============================================================================

DO $$
DECLARE
    v_constraint_name TEXT;
    v_foreign_table TEXT;
BEGIN
    -- Find the FK constraint on profiles.id
    SELECT
        tc.constraint_name,
        ccu.table_schema || '.' || ccu.table_name
    INTO v_constraint_name, v_foreign_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'id'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Found FK constraint: % pointing to %', v_constraint_name, v_foreign_table;

        -- Only drop if it's NOT pointing to auth.users
        IF v_foreign_table != 'auth.users' THEN
            RAISE NOTICE 'FK constraint points to wrong table - dropping it';
            EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || v_constraint_name;
            RAISE NOTICE 'Dropped incorrect FK constraint: %', v_constraint_name;
        ELSE
            RAISE NOTICE 'FK constraint is correct - no changes needed';
        END IF;
    ELSE
        RAISE NOTICE 'No FK constraint found on profiles.id';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADD CORRECT FK CONSTRAINT
-- ============================================================================

-- Add FK constraint to auth.users if it doesn't exist
DO $$
BEGIN
    -- Check if constraint to auth.users exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'profiles'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    ) THEN
        RAISE NOTICE 'Adding FK constraint to auth.users';

        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Successfully added FK constraint profiles.id -> auth.users.id';
    ELSE
        RAISE NOTICE 'FK constraint to auth.users already exists';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: VERIFY AND CREATE MISSING PROFILES
-- ============================================================================

-- Create profiles for any users in auth.users that don't have profiles
DO $$
DECLARE
    v_user_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_user_record IN
        SELECT
            u.id,
            u.email,
            u.raw_user_meta_data,
            u.created_at,
            u.email_confirmed_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.profiles (
                id,
                email,
                name,
                phone,
                email_verified,
                email_verified_at,
                auth_provider,
                created_at,
                last_login_at
            )
            VALUES (
                v_user_record.id,
                v_user_record.email,
                COALESCE(
                    v_user_record.raw_user_meta_data->>'name',
                    v_user_record.raw_user_meta_data->>'full_name',
                    split_part(v_user_record.email, '@', 1),
                    'User'
                ),
                COALESCE(v_user_record.raw_user_meta_data->>'phone', ''),
                COALESCE(v_user_record.email_confirmed_at IS NOT NULL, FALSE),
                v_user_record.email_confirmed_at,
                COALESCE(v_user_record.raw_user_meta_data->>'provider', 'email'),
                v_user_record.created_at,
                v_user_record.created_at
            )
            ON CONFLICT (id) DO NOTHING;

            v_count := v_count + 1;
            RAISE NOTICE 'Created profile for user: % (email: %)', v_user_record.id, v_user_record.email;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create profile for user %: %', v_user_record.email, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Created % profiles for orphaned users', v_count;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

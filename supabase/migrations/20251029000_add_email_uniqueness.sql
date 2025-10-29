-- ============================================================================
-- Migration: Add Email Uniqueness Constraint
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-29
-- Description: Ensures one email can only exist once in profiles table,
--              preventing duplicate accounts across different auth providers
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD UNIQUE CONSTRAINT ON EMAIL
-- ============================================================================

DO $$
BEGIN
    -- Add unique constraint on email column (case-insensitive)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_email_unique'
    ) THEN
        -- First, handle any existing duplicates by keeping the oldest account
        WITH duplicates AS (
            SELECT id, email, created_at,
                   ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
            FROM public.profiles
            WHERE email IS NOT NULL
        )
        UPDATE public.profiles
        SET email = email || '_duplicate_' || id::text
        WHERE id IN (
            SELECT id FROM duplicates WHERE rn > 1
        );

        -- Now add the unique constraint
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_email_unique UNIQUE (email);

        RAISE NOTICE 'Added unique constraint on profiles.email';
    END IF;
END $$;

-- Add index for faster email lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
ON public.profiles (LOWER(email));

COMMENT ON CONSTRAINT profiles_email_unique ON public.profiles
IS 'Ensures each email can only exist once in the system, preventing duplicate accounts';

-- ============================================================================
-- SECTION 2: UPDATE TRIGGER TO HANDLE DUPLICATE EMAIL SCENARIO
-- ============================================================================

-- Update the profile creation trigger to handle duplicate emails gracefully
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_provider TEXT;
    v_email_verified BOOLEAN;
    v_existing_profile_id UUID;
BEGIN
    -- Determine auth provider
    v_provider := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');

    -- Email is auto-verified for Google OAuth
    v_email_verified := (v_provider = 'google');

    -- Check if email already exists in profiles (for OAuth scenarios)
    IF v_provider != 'email' AND NEW.email IS NOT NULL THEN
        SELECT id INTO v_existing_profile_id
        FROM public.profiles
        WHERE LOWER(email) = LOWER(NEW.email)
        LIMIT 1;

        IF v_existing_profile_id IS NOT NULL THEN
            -- Email already exists - do not create duplicate profile
            -- Log this for debugging
            RAISE NOTICE 'Duplicate email detected for OAuth user. Email: %, Existing Profile ID: %, New User ID: %',
                NEW.email, v_existing_profile_id, NEW.id;

            -- Return without creating profile (auth will still succeed but profile won't be created)
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        phone,
        name,
        photo_url,
        email_verified,
        phone_verified,
        email_verified_at,
        auth_provider,
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
        v_email_verified,
        FALSE,
        CASE WHEN v_email_verified THEN NOW() ELSE NULL END,
        v_provider,
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
        photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
        email_verified = CASE
            WHEN EXCLUDED.email_verified THEN TRUE
            ELSE profiles.email_verified
        END,
        email_verified_at = CASE
            WHEN EXCLUDED.email_verified AND profiles.email_verified_at IS NULL
            THEN NOW()
            ELSE profiles.email_verified_at
        END;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Duplicate email detected - log and return without failing auth
        RAISE NOTICE 'Unique constraint violation for email: %. User ID: %', NEW.email, NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_profile_for_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        -- Don't fail auth - let user sign up even if profile creation fails
        RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: CREATE HELPER FUNCTION TO CHECK PROVIDER FOR EMAIL
-- ============================================================================

-- Function to get auth provider for an email (useful for frontend)
CREATE OR REPLACE FUNCTION public.get_auth_provider_for_email(p_email TEXT)
RETURNS TABLE(
    provider TEXT,
    has_password BOOLEAN,
    profile_exists BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p.auth_provider, 'none') as provider,
        EXISTS(
            SELECT 1 FROM auth.users u
            WHERE LOWER(u.email) = LOWER(p_email)
            AND u.encrypted_password IS NOT NULL
        ) as has_password,
        (p.id IS NOT NULL) as profile_exists
    FROM public.profiles p
    WHERE LOWER(p.email) = LOWER(p_email)
    LIMIT 1;

    -- If no profile found, return default
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'none'::TEXT, FALSE, FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_provider_for_email TO anon, authenticated;

COMMENT ON FUNCTION public.get_auth_provider_for_email
IS 'Returns the auth provider for a given email address';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

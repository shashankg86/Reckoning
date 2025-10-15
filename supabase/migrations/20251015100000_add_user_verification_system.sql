-- ============================================================================
-- Migration: Add User Verification System
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements email and phone verification system with OTP support
--              Required for Phase 1 authentication requirements
-- Dependencies: Requires initial schema (20251010084521)
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALTER PROFILES TABLE - Add Verification Columns
-- ============================================================================

DO $$ 
BEGIN
    -- Add email_verified column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        
        RAISE NOTICE 'Added email_verified column to profiles table';
    END IF;

    -- Add phone_verified column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone_verified'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
        
        RAISE NOTICE 'Added phone_verified column to profiles table';
    END IF;

    -- Add auth_provider column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'auth_provider'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email';
        
        RAISE NOTICE 'Added auth_provider column to profiles table';
    END IF;

    -- Add email_verified_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN email_verified_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added email_verified_at column to profiles table';
    END IF;

    -- Add phone_verified_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone_verified_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN phone_verified_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added phone_verified_at column to profiles table';
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    -- Auth provider constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_auth_provider'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT valid_auth_provider 
        CHECK (auth_provider IN ('email', 'google', 'phone'));
        
        RAISE NOTICE 'Added valid_auth_provider constraint';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified 
ON public.profiles(email_verified) 
WHERE email_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified 
ON public.profiles(phone_verified) 
WHERE phone_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider 
ON public.profiles(auth_provider);

COMMENT ON COLUMN public.profiles.email_verified IS 'Indicates if user email has been verified via confirmation link';
COMMENT ON COLUMN public.profiles.phone_verified IS 'Indicates if user phone has been verified via OTP';
COMMENT ON COLUMN public.profiles.auth_provider IS 'Authentication provider: email, google, or phone';
COMMENT ON COLUMN public.profiles.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN public.profiles.phone_verified_at IS 'Timestamp when phone was verified';

-- ============================================================================
-- SECTION 2: CREATE OTP VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'login', 'phone_verification', 'password_reset')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= max_attempts),
    CONSTRAINT valid_otp_code CHECK (otp_code ~ '^[0-9]{6}$'),
    CONSTRAINT phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

-- Indexes for OTP table
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose 
ON public.otp_verifications(phone, purpose, created_at DESC) 
WHERE is_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_otp_user_id 
ON public.otp_verifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_expires_at 
ON public.otp_verifications(expires_at) 
WHERE is_verified = FALSE AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_otp_cleanup 
ON public.otp_verifications(created_at) 
WHERE is_verified = TRUE OR expires_at < NOW();

-- Table comments
COMMENT ON TABLE public.otp_verifications IS 'Stores OTP codes for phone verification with rate limiting';
COMMENT ON COLUMN public.otp_verifications.purpose IS 'Purpose of OTP: signup, login, phone_verification, password_reset';
COMMENT ON COLUMN public.otp_verifications.max_attempts IS 'Maximum verification attempts allowed (default: 3)';
COMMENT ON COLUMN public.otp_verifications.ip_address IS 'IP address from which OTP was requested (for security audit)';

-- ============================================================================
-- SECTION 3: CREATE VERIFICATION AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.verification_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'phone')),
    action TEXT NOT NULL CHECK (action IN ('requested', 'verified', 'failed', 'expired')),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_user 
ON public.verification_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_audit_type_action 
ON public.verification_audit_log(verification_type, action, created_at DESC);

COMMENT ON TABLE public.verification_audit_log IS 'Audit trail for all verification attempts';

-- ============================================================================
-- SECTION 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_otp_code IS 'Generates a random 6-digit OTP code';

-- Function to create OTP with rate limiting
CREATE OR REPLACE FUNCTION public.create_otp_verification(
    p_user_id UUID,
    p_phone TEXT,
    p_purpose TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
    otp_id UUID,
    otp_code TEXT,
    expires_at TIMESTAMPTZ,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recent_count INTEGER;
    v_otp_code TEXT;
    v_otp_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Rate limiting: Check for recent OTP requests (within last 1 minute)
    SELECT COUNT(*) INTO v_recent_count
    FROM public.otp_verifications
    WHERE phone = p_phone
        AND purpose = p_purpose
        AND created_at > NOW() - INTERVAL '1 minute';
    
    IF v_recent_count >= 1 THEN
        RETURN QUERY SELECT 
            NULL::UUID, 
            NULL::TEXT, 
            NULL::TIMESTAMPTZ,
            FALSE, 
            'Rate limit exceeded. Please wait 1 minute before requesting another OTP.'::TEXT;
        RETURN;
    END IF;

    -- Invalidate any existing unverified OTPs for this phone/purpose
    UPDATE public.otp_verifications
    SET is_verified = TRUE, verified_at = NOW()
    WHERE phone = p_phone
        AND purpose = p_purpose
        AND is_verified = FALSE;

    -- Generate new OTP
    v_otp_code := public.generate_otp_code();
    v_expires_at := NOW() + INTERVAL '10 minutes';

    -- Insert new OTP
    INSERT INTO public.otp_verifications (
        user_id,
        phone,
        otp_code,
        purpose,
        expires_at,
        ip_address,
        user_agent
    )
    VALUES (
        p_user_id,
        p_phone,
        v_otp_code,
        p_purpose,
        v_expires_at,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_otp_id;

    -- Log audit entry
    INSERT INTO public.verification_audit_log (
        user_id,
        verification_type,
        action,
        metadata,
        ip_address,
        user_agent
    )
    VALUES (
        p_user_id,
        'phone',
        'requested',
        jsonb_build_object(
            'phone', p_phone,
            'purpose', p_purpose,
            'otp_id', v_otp_id
        ),
        p_ip_address,
        p_user_agent
    );

    -- Return success
    RETURN QUERY SELECT 
        v_otp_id, 
        v_otp_code, 
        v_expires_at,
        TRUE, 
        NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.create_otp_verification IS 'Creates OTP with rate limiting (1 per minute per phone/purpose)';

-- Function to verify OTP
CREATE OR REPLACE FUNCTION public.verify_otp(
    p_phone TEXT,
    p_otp_code TEXT,
    p_purpose TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_otp_record RECORD;
    v_user_id UUID;
BEGIN
    -- Find the OTP record
    SELECT * INTO v_otp_record
    FROM public.otp_verifications
    WHERE phone = p_phone
        AND purpose = p_purpose
        AND is_verified = FALSE
        AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Check if OTP exists
    IF v_otp_record IS NULL THEN
        -- Log failed attempt
        INSERT INTO public.verification_audit_log (
            verification_type,
            action,
            metadata
        )
        VALUES (
            'phone',
            'failed',
            jsonb_build_object(
                'phone', p_phone,
                'purpose', p_purpose,
                'reason', 'OTP not found or expired'
            )
        );

        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired OTP'::TEXT;
        RETURN;
    END IF;

    -- Check attempts
    IF v_otp_record.attempts >= v_otp_record.max_attempts THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Maximum verification attempts exceeded'::TEXT;
        RETURN;
    END IF;

    -- Verify OTP code
    IF v_otp_record.otp_code != p_otp_code THEN
        -- Increment attempts
        UPDATE public.otp_verifications
        SET attempts = attempts + 1
        WHERE id = v_otp_record.id;

        -- Log failed attempt
        INSERT INTO public.verification_audit_log (
            user_id,
            verification_type,
            action,
            metadata
        )
        VALUES (
            v_otp_record.user_id,
            'phone',
            'failed',
            jsonb_build_object(
                'phone', p_phone,
                'purpose', p_purpose,
                'reason', 'Incorrect OTP',
                'attempts', v_otp_record.attempts + 1
            )
        );

        RETURN QUERY SELECT FALSE, NULL::UUID, 'Incorrect OTP'::TEXT;
        RETURN;
    END IF;

    -- OTP is correct - mark as verified
    UPDATE public.otp_verifications
    SET is_verified = TRUE,
        verified_at = NOW()
    WHERE id = v_otp_record.id;

    v_user_id := v_otp_record.user_id;

    -- Update profile if user exists
    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET phone_verified = TRUE,
            phone_verified_at = NOW(),
            phone = p_phone
        WHERE id = v_user_id;
    END IF;

    -- Log success
    INSERT INTO public.verification_audit_log (
        user_id,
        verification_type,
        action,
        metadata
    )
    VALUES (
        v_user_id,
        'phone',
        'verified',
        jsonb_build_object(
            'phone', p_phone,
            'purpose', p_purpose
        )
    );

    RETURN QUERY SELECT TRUE, v_user_id, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.verify_otp IS 'Verifies OTP code with attempt tracking and automatic profile update';

-- ============================================================================
-- SECTION 5: UPDATE EXISTING TRIGGER FOR PROFILE CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_provider TEXT;
    v_email_verified BOOLEAN;
BEGIN
    -- Determine auth provider
    v_provider := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
    
    -- Email is auto-verified for Google OAuth
    v_email_verified := (v_provider = 'google');

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
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_profile_for_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        -- Don't fail auth - let user sign up even if profile creation fails
        RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 6: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- OTP Verifications Policies
CREATE POLICY "Users can view own OTP verifications"
ON public.otp_verifications
FOR SELECT
USING (
    user_id = auth.uid() 
    OR phone IN (SELECT phone FROM public.profiles WHERE id = auth.uid())
);

-- Service role can manage all OTPs (for backend operations)
CREATE POLICY "Service role full access to OTP"
ON public.otp_verifications
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Audit Log Policies
CREATE POLICY "Users can view own audit log"
ON public.verification_audit_log
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role full access to audit log"
ON public.verification_audit_log
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SECTION 7: CREATE CLEANUP JOB (PostgreSQL pg_cron extension required)
-- ============================================================================

-- Note: This requires pg_cron extension to be enabled in Supabase
-- For manual cleanup, run this periodically:

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired OTPs older than 24 hours
    DELETE FROM public.otp_verifications
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired OTP records', v_deleted_count;
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_otps IS 'Cleanup function for expired OTPs (run daily via cron)';

-- ============================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON public.otp_verifications TO authenticated;
GRANT SELECT ON public.verification_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_otp_verification TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_otp TO authenticated;

-- ============================================================================
-- SECTION 9: DATA MIGRATION
-- ============================================================================

-- Mark existing Google OAuth users as email verified
UPDATE public.profiles
SET email_verified = TRUE,
    email_verified_at = created_at
WHERE auth_provider = 'google' 
    AND email_verified = FALSE;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop functions
DROP FUNCTION IF EXISTS public.verify_otp CASCADE;
DROP FUNCTION IF EXISTS public.create_otp_verification CASCADE;
DROP FUNCTION IF EXISTS public.generate_otp_code CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_otps CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.verification_audit_log CASCADE;
DROP TABLE IF EXISTS public.otp_verifications CASCADE;

-- Remove columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
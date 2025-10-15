-- ============================================================================
-- Migration: Add User Preferences System
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements user preferences for language, currency, and regional settings
--              Required for Phase 1 multi-language/multi-currency support
-- Dependencies: Requires 20251015100000_add_user_verification_system.sql
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALTER PROFILES TABLE - Add Preference Columns
-- ============================================================================

DO $$ 
BEGIN
    -- Add preferred_language column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en';
        
        RAISE NOTICE 'Added preferred_language column to profiles table';
    END IF;

    -- Add preferred_currency column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'preferred_currency'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN preferred_currency TEXT NOT NULL DEFAULT 'INR';
        
        RAISE NOTICE 'Added preferred_currency column to profiles table';
    END IF;

    -- Add timezone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
        
        RAISE NOTICE 'Added timezone column to profiles table';
    END IF;

    -- Add date_format preference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'date_format'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY';
        
        RAISE NOTICE 'Added date_format column to profiles table';
    END IF;

    -- Add time_format preference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'time_format'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN time_format TEXT NOT NULL DEFAULT '12h';
        
        RAISE NOTICE 'Added time_format column to profiles table';
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    -- Language constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_preferred_language'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT valid_preferred_language 
        CHECK (preferred_language IN ('en', 'hi', 'ar'));
        
        RAISE NOTICE 'Added valid_preferred_language constraint';
    END IF;

    -- Currency constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_preferred_currency'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT valid_preferred_currency 
        CHECK (preferred_currency IN ('INR', 'AED'));
        
        RAISE NOTICE 'Added valid_preferred_currency constraint';
    END IF;

    -- Date format constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_date_format'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT valid_date_format 
        CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));
        
        RAISE NOTICE 'Added valid_date_format constraint';
    END IF;

    -- Time format constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_time_format'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT valid_time_format 
        CHECK (time_format IN ('12h', '24h'));
        
        RAISE NOTICE 'Added valid_time_format constraint';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language 
ON public.profiles(preferred_language);

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_currency 
ON public.profiles(preferred_currency);

-- Add comments
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language: en (English), hi (Hindi), ar (Arabic)';
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred currency: INR (Indian Rupee), AED (UAE Dirham)';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone (IANA timezone identifier)';
COMMENT ON COLUMN public.profiles.date_format IS 'Preferred date display format';
COMMENT ON COLUMN public.profiles.time_format IS 'Preferred time display format: 12h or 24h';

-- ============================================================================
-- SECTION 2: UPDATE STORES TABLE - Add Regional Settings
-- ============================================================================

DO $$ 
BEGIN
    -- Add timezone column to stores
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stores' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.stores 
        ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
        
        RAISE NOTICE 'Added timezone column to stores table';
    END IF;

    -- Add default_tax_rate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stores' 
        AND column_name = 'default_tax_rate'
    ) THEN
        ALTER TABLE public.stores 
        ADD COLUMN default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00;
        
        RAISE NOTICE 'Added default_tax_rate column to stores table';
    END IF;
END $$;

-- Add constraints to stores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_default_tax_rate'
    ) THEN
        ALTER TABLE public.stores 
        ADD CONSTRAINT valid_default_tax_rate 
        CHECK (default_tax_rate >= 0 AND default_tax_rate <= 100);
        
        RAISE NOTICE 'Added valid_default_tax_rate constraint to stores';
    END IF;
END $$;

COMMENT ON COLUMN public.stores.default_tax_rate IS 'Default tax rate (%) for this store (e.g., GST in India)';
COMMENT ON COLUMN public.stores.timezone IS 'Store timezone (IANA timezone identifier)';

-- ============================================================================
-- SECTION 3: CREATE USER PREFERENCES CHANGE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('language', 'currency', 'timezone', 'date_format', 'time_format')),
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_log_user 
ON public.user_preferences_log(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_preferences_log_type 
ON public.user_preferences_log(preference_type, changed_at DESC);

COMMENT ON TABLE public.user_preferences_log IS 'Audit log for user preference changes';

-- Enable RLS
ALTER TABLE public.user_preferences_log ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own preference changes"
ON public.user_preferences_log
FOR SELECT
USING (user_id = auth.uid());

-- ============================================================================
-- SECTION 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user locale settings
CREATE OR REPLACE FUNCTION public.get_user_locale_settings(p_user_id UUID)
RETURNS TABLE(
    language TEXT,
    currency TEXT,
    timezone TEXT,
    date_format TEXT,
    time_format TEXT,
    currency_symbol TEXT,
    currency_position TEXT,
    decimal_separator TEXT,
    thousand_separator TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.preferred_language,
        p.preferred_currency,
        p.timezone,
        p.date_format,
        p.time_format,
        CASE p.preferred_currency
            WHEN 'INR' THEN '₹'
            WHEN 'AED' THEN 'د.إ'
            ELSE '$'
        END AS currency_symbol,
        CASE p.preferred_currency
            WHEN 'INR' THEN 'before'
            WHEN 'AED' THEN 'after'
            ELSE 'before'
        END AS currency_position,
        CASE p.preferred_language
            WHEN 'ar' THEN ','
            ELSE '.'
        END AS decimal_separator,
        CASE p.preferred_language
            WHEN 'en' THEN ','
            WHEN 'hi' THEN ','
            WHEN 'ar' THEN ' '
            ELSE ','
        END AS thousand_separator
    FROM public.profiles p
    WHERE p.id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_locale_settings IS 'Returns comprehensive locale settings for a user including currency symbols and formatting rules';

-- Function to update user preferences with audit logging
CREATE OR REPLACE FUNCTION public.update_user_preferences(
    p_user_id UUID,
    p_language TEXT DEFAULT NULL,
    p_currency TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_date_format TEXT DEFAULT NULL,
    p_time_format TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_profile RECORD;
BEGIN
    -- Verify user owns this profile
    IF p_user_id != auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized'::TEXT;
        RETURN;
    END IF;

    -- Get current values
    SELECT * INTO v_old_profile
    FROM public.profiles
    WHERE id = p_user_id;

    -- Update language if provided
    IF p_language IS NOT NULL AND p_language != v_old_profile.preferred_language THEN
        UPDATE public.profiles
        SET preferred_language = p_language
        WHERE id = p_user_id;

        INSERT INTO public.user_preferences_log (
            user_id, preference_type, old_value, new_value, ip_address, user_agent
        ) VALUES (
            p_user_id, 'language', v_old_profile.preferred_language, p_language, p_ip_address, p_user_agent
        );
    END IF;

    -- Update currency if provided
    IF p_currency IS NOT NULL AND p_currency != v_old_profile.preferred_currency THEN
        UPDATE public.profiles
        SET preferred_currency = p_currency
        WHERE id = p_user_id;

        INSERT INTO public.user_preferences_log (
            user_id, preference_type, old_value, new_value, ip_address, user_agent
        ) VALUES (
            p_user_id, 'currency', v_old_profile.preferred_currency, p_currency, p_ip_address, p_user_agent
        );
    END IF;

    -- Update timezone if provided
    IF p_timezone IS NOT NULL AND p_timezone != v_old_profile.timezone THEN
        UPDATE public.profiles
        SET timezone = p_timezone
        WHERE id = p_user_id;

        INSERT INTO public.user_preferences_log (
            user_id, preference_type, old_value, new_value, ip_address, user_agent
        ) VALUES (
            p_user_id, 'timezone', v_old_profile.timezone, p_timezone, p_ip_address, p_user_agent
        );
    END IF;

    -- Update date_format if provided
    IF p_date_format IS NOT NULL AND p_date_format != v_old_profile.date_format THEN
        UPDATE public.profiles
        SET date_format = p_date_format
        WHERE id = p_user_id;

        INSERT INTO public.user_preferences_log (
            user_id, preference_type, old_value, new_value, ip_address, user_agent
        ) VALUES (
            p_user_id, 'date_format', v_old_profile.date_format, p_date_format, p_ip_address, p_user_agent
        );
    END IF;

    -- Update time_format if provided
    IF p_time_format IS NOT NULL AND p_time_format != v_old_profile.time_format THEN
        UPDATE public.profiles
        SET time_format = p_time_format
        WHERE id = p_user_id;

        INSERT INTO public.user_preferences_log (
            user_id, preference_type, old_value, new_value, ip_address, user_agent
        ) VALUES (
            p_user_id, 'time_format', v_old_profile.time_format, p_time_format, p_ip_address, p_user_agent
        );
    END IF;

    RETURN QUERY SELECT TRUE, 'Preferences updated successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.update_user_preferences IS 'Updates user preferences with audit logging';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_locale_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_preferences TO authenticated;

-- ============================================================================
-- SECTION 5: DATA MIGRATION - Set Defaults Based on Location
-- ============================================================================

-- Update existing profiles based on store country (if available)
UPDATE public.profiles p
SET 
    preferred_currency = CASE 
        WHEN s.country IN ('UAE', 'United Arab Emirates') THEN 'AED'
        ELSE 'INR'
    END,
    preferred_language = CASE 
        WHEN s.country IN ('UAE', 'United Arab Emirates') THEN 'ar'
        ELSE 'en'
    END,
    timezone = CASE 
        WHEN s.country IN ('UAE', 'United Arab Emirates') THEN 'Asia/Dubai'
        ELSE 'Asia/Kolkata'
    END
FROM public.stores s
JOIN public.store_members sm ON sm.store_id = s.id
WHERE sm.user_id = p.id
    AND p.preferred_currency = 'INR'  -- Only update if still default
    AND p.preferred_language = 'en';  -- Only update if still default

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop functions
DROP FUNCTION IF EXISTS public.update_user_preferences CASCADE;
DROP FUNCTION IF EXISTS public.get_user_locale_settings CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.user_preferences_log CASCADE;

-- Remove columns from stores
ALTER TABLE public.stores DROP COLUMN IF EXISTS default_tax_rate;
ALTER TABLE public.stores DROP COLUMN IF EXISTS timezone;

-- Remove columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS time_format;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_format;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS timezone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_currency;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_language;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- ============================================================================
-- Simple Check and Fix for Missing Profiles
-- ============================================================================

-- STEP 1: Check current state
DO $$
DECLARE
    v_users_count INTEGER;
    v_profiles_count INTEGER;
    v_orphaned_count INTEGER;
BEGIN
    -- Count users in auth.users
    SELECT COUNT(*) INTO v_users_count FROM auth.users;

    -- Count profiles
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;

    -- Count orphaned users (users without profiles)
    SELECT COUNT(*) INTO v_orphaned_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

    RAISE NOTICE '=== Current State ===';
    RAISE NOTICE 'Total users in auth.users: %', v_users_count;
    RAISE NOTICE 'Total profiles: %', v_profiles_count;
    RAISE NOTICE 'Users without profiles: %', v_orphaned_count;
END $$;

-- STEP 2: List users without profiles
DO $$
DECLARE
    v_user_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Users Without Profiles ===';

    FOR v_user_record IN
        SELECT u.id, u.email, u.email_confirmed_at, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
        ORDER BY u.created_at DESC
    LOOP
        RAISE NOTICE 'User: % | Email: % | Confirmed: % | Created: %',
            v_user_record.id,
            v_user_record.email,
            CASE WHEN v_user_record.email_confirmed_at IS NOT NULL THEN 'Yes' ELSE 'No' END,
            v_user_record.created_at;
    END LOOP;
END $$;

-- STEP 3: Create profiles for users without profiles
DO $$
DECLARE
    v_user_record RECORD;
    v_count INTEGER := 0;
    v_provider TEXT;
    v_name TEXT;
    v_phone TEXT;
    v_email_verified BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Creating Missing Profiles ===';

    FOR v_user_record IN
        SELECT u.id, u.email, u.raw_user_meta_data, u.created_at, u.email_confirmed_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            -- Extract metadata
            v_provider := COALESCE(v_user_record.raw_user_meta_data->>'provider', 'email');
            v_name := COALESCE(
                v_user_record.raw_user_meta_data->>'name',
                v_user_record.raw_user_meta_data->>'full_name',
                split_part(v_user_record.email, '@', 1),
                'User'
            );
            v_phone := COALESCE(v_user_record.raw_user_meta_data->>'phone', '');
            v_email_verified := (v_provider = 'google' OR v_user_record.email_confirmed_at IS NOT NULL);

            -- Insert profile
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
                v_name,
                v_phone,
                v_email_verified,
                CASE
                    WHEN v_email_verified THEN COALESCE(v_user_record.email_confirmed_at, v_user_record.created_at)
                    ELSE NULL
                END,
                v_provider,
                v_user_record.created_at,
                v_user_record.created_at
            );

            v_count := v_count + 1;
            RAISE NOTICE 'Created profile for: % (email: %)', v_user_record.id, v_user_record.email;

        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create profile for %: % (SQLSTATE: %)',
                    v_user_record.email, SQLERRM, SQLSTATE;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== Summary ===';
    RAISE NOTICE 'Successfully created % profiles', v_count;
END $$;

-- STEP 4: Verify fix
DO $$
DECLARE
    v_remaining INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '=== Final Check ===';
    IF v_remaining = 0 THEN
        RAISE NOTICE 'SUCCESS: All users now have profiles!';
    ELSE
        RAISE WARNING 'There are still % users without profiles', v_remaining;
    END IF;
END $$;

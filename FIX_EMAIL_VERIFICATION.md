# Email Verification Profile Creation Fix

## Problem Summary

After implementing email verification, users were unable to log in after verifying their email. The error was:
```
No account found. Please sign up first.
```

### Root Cause

The issue had **two parts**:

1. **Missing Database Trigger**: The trigger function `create_profile_for_user()` existed, but the trigger itself was never created on `auth.users` table. This meant profiles were never automatically created when users signed up.

2. **Foreign Key Constraint**: When trying to manually create profiles, a foreign key constraint error occurred, suggesting the profiles table might have incorrect FK constraints.

## Solution

### Step 1: Apply the Migration

The migration file `supabase/migrations/20251105000_fix_profile_creation_trigger.sql` contains:

1. **Creates the missing trigger** on `auth.users` that automatically creates profiles
2. **Fixes orphaned users** - creates profiles for any existing users that don't have profiles yet
3. **Verifies database structure** is correct

#### How to Apply (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251105000_fix_profile_creation_trigger.sql`
5. Paste and click **Run**
6. Check the output for success messages

#### How to Apply (Supabase CLI - if you have it set up)

```bash
supabase db push
```

### Step 2: Verify the Fix

Run the debugging script to verify everything is set up correctly:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of `debug_profile_issue.sql`
3. Run it and check:
   - ✅ Trigger `on_auth_user_created` should be `enabled` on `auth.users`
   - ✅ FK constraints on profiles should reference `auth.users(id)`
   - ✅ All users in `auth.users` should have corresponding profiles

### Step 3: Test the Email Verification Flow

1. **Sign up with a new email**:
   - Go to signup page
   - Enter email, password, name
   - Should redirect to `/verify-email` screen

2. **Check your email**:
   - Open verification email
   - Click the verification link
   - Should redirect to `/auth/callback` then to `/login`

3. **Login**:
   - Enter the email and password
   - Should successfully login and redirect to onboarding

## What Changed in the Code

### New Files Created

1. **`supabase/migrations/20251105000_fix_profile_creation_trigger.sql`**
   - Creates missing database trigger
   - Fixes orphaned users
   - Adds proper permissions

2. **`debug_profile_issue.sql`**
   - Diagnostic queries to verify database setup

3. **`src/screens/EmailVerificationScreen.tsx`**
   - Waiting screen shown after signup
   - Resend email functionality
   - Uses existing project components and translations

4. **`src/screens/AuthCallbackScreen.tsx`**
   - Handles email verification link clicks
   - Ensures profile exists (fallback if trigger fails)
   - Shows success/error states

### Modified Files

1. **`src/contexts/AuthContext.tsx`**
   - `register()` now detects if email verification is required
   - Returns `{ requiresEmailVerification: boolean, email: string }`

2. **`src/screens/SignupScreen.tsx`**
   - Redirects to `/verify-email` when verification is required
   - Passes email via navigation state

3. **`src/components/Router.tsx`**
   - Added `/verify-email` route
   - Added `/auth/callback` route

4. **`src/api/auth.ts`**
   - `ensureProfile()` now throws errors instead of returning null
   - Conditional profile creation based on session existence
   - Detailed console logging for debugging

5. **`src/locales/en.json`**
   - Added 18 new translation keys for email verification UI

## How It Works Now

### With Email Verification ON (current setup)

1. User submits signup form
2. Supabase creates user in `auth.users` (session is NULL)
3. **Database trigger fires** → creates profile automatically
4. Frontend detects no session → redirects to `/verify-email`
5. User clicks link in email
6. Supabase confirms email → creates session
7. Frontend redirects to `/auth/callback`
8. AuthCallback ensures profile exists (should already exist from trigger)
9. Redirects to `/login` with success message
10. User logs in → redirects to onboarding

### With Email Verification OFF

1. User submits signup form
2. Supabase creates user in `auth.users` (session created immediately)
3. **Database trigger fires** → creates profile automatically
4. Frontend detects session exists → proceeds to onboarding directly

## Troubleshooting

### If profiles still aren't being created:

1. **Check trigger is enabled**:
   ```sql
   SELECT tgname, tgenabled, tgrelid::regclass
   FROM pg_trigger
   WHERE tgname = 'on_auth_user_created';
   ```

2. **Check RLS policies allow INSERT**:
   ```sql
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = 'profiles';
   ```

3. **Check trigger function permissions**:
   ```sql
   SELECT routine_name, routine_type, security_type
   FROM information_schema.routines
   WHERE routine_name = 'create_profile_for_user';
   ```

### If you still get FK constraint errors:

This likely means the profiles table has an incorrect FK constraint. Check with:

```sql
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';
```

The `profiles.id` column should reference `auth.users.id`, not a public.users table.

## Questions?

If you encounter any issues:

1. Run `debug_profile_issue.sql` and share the output
2. Check browser console for detailed error logs
3. Check Supabase logs in Dashboard → Logs
4. Share any error messages you see

The fix ensures profiles are automatically created for both email signup and Google OAuth, with or without email verification enabled.

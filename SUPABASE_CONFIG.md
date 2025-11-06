# Supabase Configuration for Email Verification

## ⚠️ CRITICAL: Must Configure Before Testing

**If you skip this, verification links will show as "expired" even when fresh!**

## Step 1: Add Redirect URLs (REQUIRED)

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Find the **"Redirect URLs"** section and add:

```
http://localhost:5173/auth/callback
http://localhost:5173/*
```

**Important Notes:**
- You must add BOTH URLs
- Click **Save** after adding
- Without this, all verification links will fail with "otp_expired" error
- The `*` wildcard is important for Supabase to accept the callback

### For Production (add these too when deploying):
```
https://yourdomain.com/auth/callback
https://yourdomain.com/*
```

## Step 2: Enable Email Confirmations

Go to: **Supabase Dashboard → Authentication → Providers → Email**

Make sure:
- ✅ **"Enable Email Provider"** is ON
- ✅ **"Confirm email"** is ENABLED
- ✅ **"Secure email change"** is enabled (optional, recommended)

## Step 3: Check Site URL

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Make sure **Site URL** is set to:
```
http://localhost:5173
```

(Change to your production URL when deploying)

## Step 4: Test the Configuration

### Clear Everything First:
1. Clear browser cache (or use incognito)
2. Make sure you're using a NEW email (not previously used)

### Test Flow:
1. Go to signup page
2. Sign up with a fresh email
3. Check the verification email
4. The link should look like:
   ```
   https://[project-ref].supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=http://localhost:5173/auth/callback
   ```
5. Click the link
6. Should redirect to: `http://localhost:5173/auth/callback#access_token=...`
7. Should see AuthCallbackScreen logs in browser console
8. Should redirect to onboarding ✅

## Troubleshooting

### Issue: Link shows "expired" immediately

**Cause:** Redirect URL not whitelisted in Supabase

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `http://localhost:5173/auth/callback` to Redirect URLs
3. Add `http://localhost:5173/*` to Redirect URLs
4. Click Save
5. Try signing up again with a DIFFERENT email

### Issue: "Invalid Redirect URL" error

**Cause:** Same as above - redirect URL not whitelisted

**Fix:** Add the URLs as shown in Step 1

### Issue: Redirects to homepage instead of /auth/callback

**Cause:** Old email links before code was updated

**Fix:** Sign up with a NEW email to get a fresh verification link

### Issue: Still not working after adding URLs

**Checklist:**
1. ✅ Did you click **Save** in Supabase dashboard?
2. ✅ Are you using a completely NEW email (not previously used)?
3. ✅ Did you clear browser cache / use incognito mode?
4. ✅ Is the Site URL set to `http://localhost:5173`?
5. ✅ Is "Confirm email" enabled in Email Provider settings?

### Issue: Profile creation fails

**Cause:** Database is missing profiles for existing users

**Fix:** Run `check_and_fix_profiles.sql` in Supabase SQL Editor

## Email Templates (Optional)

Go to: **Supabase Dashboard → Authentication → Email Templates**

You can customize the **"Confirm signup"** email template if needed.

Default variables available:
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Token }}` - The verification token
- `{{ .Email }}` - User's email
- `{{ .SiteURL }}` - Your site URL

## Production Deployment

When deploying to production:

1. Update Site URL to your production domain
2. Add production redirect URLs:
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/*
   ```
3. Update `emailRedirectTo` in code if using different domain
4. Test the flow in production before going live

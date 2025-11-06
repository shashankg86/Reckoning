# Supabase Configuration for Email Verification

## Required Configuration in Supabase Dashboard

### 1. Add Redirect URLs

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Add these URLs to **Redirect URLs** (whitelist):

#### For Local Development:
```
http://localhost:5173/auth/callback
http://localhost:5173/*
```

#### For Production:
```
https://yourdomain.com/auth/callback
https://yourdomain.com/*
```

### 2. Enable Email Confirmations

Go to: **Supabase Dashboard → Authentication → Providers → Email**

Make sure:
- ✅ **"Confirm email"** is enabled
- ✅ **"Secure email change"** is enabled (optional, recommended)

### 3. Email Templates (Optional)

Go to: **Supabase Dashboard → Authentication → Email Templates**

You can customize the **"Confirm signup"** email template if needed.

Default variables available:
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Token }}` - The verification token
- `{{ .Email }}` - User's email
- `{{ .SiteURL }}` - Your site URL

### 4. Test the Configuration

1. Sign up with a new email
2. Check the verification email
3. The link should look like:
   ```
   https://[project-ref].supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=http://localhost:5173/auth/callback
   ```
4. Notice the `redirect_to` parameter now points to `/auth/callback` ✅

### Troubleshooting

**If verification link still redirects to homepage:**
- Make sure `/auth/callback` is added to Redirect URLs in Supabase dashboard
- Clear browser cache and try signing up again with a new email
- Check Supabase logs: Dashboard → Logs → Auth logs

**If you get "Invalid Redirect URL" error:**
- The redirect URL is not whitelisted in Supabase
- Add it to the Redirect URLs list in URL Configuration

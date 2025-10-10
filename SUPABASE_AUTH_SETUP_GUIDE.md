# 🇮🇳 Supabase Authentication Setup Guide (India)

## ✅ Migration Complete!

Your app is now connected to YOUR Supabase database:
- **Project URL:** https://gfoemzogpygwsapqtxsy.supabase.co
- **Region:** Mumbai, India
- **All 8 tables created** ✅
- **Row Level Security enabled** ✅
- **Auto-profile creation working** ✅

---

## 📋 Now Enable Authentication (5 Minutes)

### Step 1: Enable Email Authentication (Already Enabled!)

Email authentication is **enabled by default** in Supabase, but let's verify:

1. **Go to your Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/gfoemzogpygwsapqtxsy
   ```

2. **Click "Authentication" in the left sidebar**

3. **Click "Providers"**

4. **Find "Email" in the list**
   - It should show as **ENABLED** (green toggle)
   - If not, toggle it ON

5. **Settings to verify:**
   - ✅ Enable email signup: **ON**
   - ✅ Enable email confirmations: **OFF** (for testing - turn ON for production)
   - ✅ Secure email change: **ON**
   - ✅ Secure password change: **ON**

6. **Click "Save"**

**Status: Email auth is ready!** ✅

---

### Step 2: Enable Google OAuth (2 Minutes)

Now let's add Google login:

#### Option A: Quick Setup (Development Mode - FASTEST)

1. **In Supabase Dashboard:**
   - Go to: **Authentication** → **Providers**
   
2. **Scroll down to find "Google"**

3. **Toggle "Enable Sign in with Google" to ON**

4. **Select: "Use development keys"**
   - This uses Supabase's test Google app
   - Perfect for testing
   - Works immediately
   - No configuration needed!

5. **Redirect URLs** (should auto-populate):
   ```
   https://gfoemzogpygwsapqtxsy.supabase.co/auth/v1/callback
   ```

6. **Click "Save"**

**Status: Google OAuth ready for testing!** ✅

#### Option B: Production Setup (Your Own Google Credentials)

Only do this when you're ready to launch (skip for now):

1. Go to: https://console.cloud.google.com
2. Create new project: "Universal POS"
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Set authorized redirect URI:
   ```
   https://gfoemzogpygwsapqtxsy.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Client Secret
7. Paste in Supabase Dashboard
8. Save

**For now, stick with Option A (development mode)!**

---

## 🎯 Authentication Setup Complete Checklist

- [x] Project migrated to your Supabase
- [x] All database tables created
- [x] Row Level Security enabled
- [ ] Email auth verified (do Step 1 above)
- [ ] Google OAuth enabled (do Step 2 above)
- [ ] Test email signup (instructions below)
- [ ] Test Google login (instructions below)

---

## 🧪 Testing Authentication

### Test 1: Email Signup & Login

1. **Open your app:**
   ```
   http://localhost:5173
   ```
   (or whatever URL your app is running on)

2. **Click "Sign Up"**

3. **Fill in the form:**
   - Name: Test User
   - Phone: 9876543210
   - Email: test@example.com
   - Password: Test123!@#

4. **Click "Sign Up" button**

**Expected result:**
- ✅ Account created
- ✅ Redirected to onboarding
- ✅ No errors in console

5. **Log out and try logging in:**
   - Go to `/login`
   - Enter: test@example.com / Test123!@#
   - Click "Login"
   - Should redirect to dashboard

**If this works: Email auth is perfect!** ✅

---

### Test 2: Google OAuth Login

1. **Open your app:**
   ```
   http://localhost:5173/login
   ```

2. **Click "Continue with Google" button**

**Expected result:**
- ✅ Redirects to Google login page
- ✅ Shows "Choose an account"
- ✅ Select your Google account
- ✅ Returns to your app
- ✅ Redirected to onboarding (first time) or dashboard
- ✅ Profile created in database

**If this works: Google OAuth is perfect!** ✅

---

## 🔍 Verify Users in Dashboard

After testing, verify users were created:

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/gfoemzogpygwsapqtxsy
   ```

2. **Click "Authentication" → "Users"**

3. **You should see:**
   - Test user (email signup)
   - Your Google user (if tested)
   - Email addresses
   - Created timestamps

4. **Click "Table Editor" → "profiles"**

5. **You should see:**
   - Profile rows for each user
   - Names, emails, phones
   - Auto-created by trigger!

---

## 🎨 Your App's Authentication Flow

### Email Signup Flow:
```
User visits /signup
  ↓
Fills: name, phone, email, password
  ↓
Clicks "Sign Up"
  ↓
Supabase creates auth user
  ↓
Trigger auto-creates profile in profiles table
  ↓
User logged in automatically
  ↓
Redirects to /onboarding
```

### Email Login Flow:
```
User visits /login
  ↓
Enters email + password
  ↓
Clicks "Login"
  ↓
Supabase verifies credentials
  ↓
Returns session token
  ↓
App stores session
  ↓
Redirects to /dashboard
```

### Google OAuth Flow:
```
User visits /login
  ↓
Clicks "Continue with Google"
  ↓
Redirects to Google consent screen
  ↓
User selects Google account
  ↓
Google returns to Supabase callback
  ↓
Supabase creates auth user (if new)
  ↓
Trigger auto-creates profile
  ↓
Redirects to app with session
  ↓
App detects new user → /onboarding
OR existing user → /dashboard
```

---

## 🔒 Security Features Included

### Row Level Security (RLS):
- ✅ Users can only see their own profile
- ✅ Users can only access stores they're members of
- ✅ Role-based permissions (owner/manager/cashier)
- ✅ Data isolation between stores
- ✅ No user can access another user's data

### Password Security:
- ✅ Passwords hashed by Supabase (bcrypt)
- ✅ Never stored in plain text
- ✅ Minimum length enforcement
- ✅ Password reset via email

### Session Management:
- ✅ JWT tokens (secure)
- ✅ Auto-refresh on expiry
- ✅ Logout clears all sessions
- ✅ Multiple device support

---

## 🇮🇳 India-Specific Features

Your POS system includes:
- ✅ Currency default: INR (₹)
- ✅ Tax rate default: 18% GST
- ✅ Country default: India
- ✅ Phone number support (10 digits)
- ✅ Mumbai server (low latency)
- ✅ UPI payment method support
- ✅ GST number field in stores

---

## 📱 Supported Authentication Methods

### Currently Active:
1. ✅ **Email/Password** (always works)
2. ✅ **Google OAuth** (via development mode)

### Can Add Later:
3. Phone/SMS (requires Twilio)
4. Facebook
5. GitHub
6. Apple
7. Microsoft Azure
8. Magic Links (passwordless email)

---

## 🆘 Troubleshooting

### Problem: "Email already registered"
**Solution:**
- User already exists
- Try logging in instead of signing up
- Or use password reset

### Problem: Google login shows error
**Solution:**
- Make sure you enabled Google in Providers
- Check "development mode" is selected
- Clear browser cache
- Try incognito/private window

### Problem: "Profile creation failed"
**Solution:**
- Check Supabase logs: Dashboard → Logs → Postgres
- Verify trigger exists: Table Editor → triggers
- Should see: `on_auth_user_created`

### Problem: Can't see users in dashboard
**Solution:**
- Click Authentication → Users (not Table Editor)
- Refresh the page
- Check you're in correct project

### Problem: "Session expired"
**Solution:**
- Normal after 1 hour of inactivity
- Just login again
- Session auto-refreshes on activity

---

## 🎯 Next Steps After Testing

Once both auth methods work:

1. **Add test data:**
   - Complete onboarding
   - Add some products
   - Create a test invoice
   - Check reports

2. **Test role-based access:**
   - Invite a team member
   - Test manager permissions
   - Test cashier permissions

3. **Production checklist:**
   - Enable email confirmation
   - Setup custom email templates
   - Add your own Google OAuth credentials
   - Configure password policies
   - Set up email rate limiting

---

## 📊 Current Status

**Database:** ✅ Connected to YOUR Supabase
**Tables:** ✅ All 8 tables created
**Security:** ✅ RLS enabled on all tables
**Email Auth:** ⏳ Ready (verify in dashboard)
**Google OAuth:** ⏳ Enable in dashboard (2 mins)
**Testing:** ⏳ Test both methods

---

## 🚀 Quick Start Commands

```bash
# If dev server not running:
npm run dev

# Open in browser:
# http://localhost:5173

# Test signup:
# Go to: /signup
# Fill form and submit

# Test Google:
# Go to: /login
# Click "Continue with Google"
```

---

## 📞 Support Links

**Your Supabase Dashboard:**
https://supabase.com/dashboard/project/gfoemzogpygwsapqtxsy

**Supabase Auth Docs:**
https://supabase.com/docs/guides/auth

**Google OAuth Setup:**
https://supabase.com/docs/guides/auth/social-login/auth-google

**Supabase Discord (Help):**
https://discord.supabase.com

---

**Time to complete:** 5 minutes
**Difficulty:** Easy
**Your next step:** Enable Google OAuth in your dashboard! 🚀

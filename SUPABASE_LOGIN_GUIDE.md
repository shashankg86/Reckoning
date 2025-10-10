# 📖 Step-by-Step: Login to Supabase & Enable Google OAuth

## Part 1: Login to Supabase Dashboard

### Step 1: Go to Supabase Website
Open your browser and go to:
```
https://supabase.com/dashboard
```

### Step 2: Sign In
You'll see a login page. You have several options:

#### Option A: If you created Supabase account with GitHub
- Click **"Continue with GitHub"**
- Enter your GitHub credentials
- Authorize Supabase if asked

#### Option B: If you created Supabase account with Google
- Click **"Continue with Google"**
- Select your Google account
- Click "Allow"

#### Option C: If you created Supabase account with Email
- Enter your email address
- Click "Continue"
- Enter your password
- Click "Sign In"

### Step 3: You'll See Your Dashboard
After login, you'll see:
- A list of your projects
- Or if this is your first time: "Create a new project"

---

## Part 2: Find Your Project

### Step 1: Look for Project Named
Your project is likely named something like:
- `universal-pos`
- Or you'll see the project ID: `ixqmiskmnhiwvlipxtdk`

### Step 2: Click on the Project
Click on the project card/name to open it

---

## Part 3: Enable Google OAuth

### Step 1: Find Authentication in Sidebar
On the left sidebar, you'll see:
- 📊 Home
- 🔧 Table Editor
- 🔐 **Authentication** ← Click this!
- 📦 Storage
- etc.

### Step 2: Click on "Providers"
After clicking Authentication, you'll see tabs at the top:
- Users
- **Providers** ← Click this!
- Policies
- Templates
- etc.

### Step 3: Find Google in the List
Scroll down through the list of providers:
- Email
- Phone
- Apple
- Azure
- Discord
- Facebook
- GitHub
- **Google** ← Find this!
- etc.

### Step 4: Enable Google
Click on **Google** to expand it. You'll see:

```
☐ Enable Sign in with Google
```

**Toggle this switch to ON** (it will turn green/blue)

### Step 5: Choose Development Mode
After enabling, you'll see options:

**Option 1: Use Development Mode (RECOMMENDED FOR TESTING)**
- ✅ Check "Use development mode"
- This allows testing without Google credentials
- Works immediately
- Perfect for development

**Option 2: Production Mode (For Live Apps)**
- Leave "Use development mode" unchecked
- You'll need:
  - Google Client ID
  - Google Client Secret
  - (Skip this for now, use dev mode first!)

### Step 6: Set Redirect URL (Should be pre-filled)
You should see:
```
Redirect URL: https://ixqmiskmnhiwvlipxtdk.supabase.co/auth/v1/callback
```

This should already be correct. Don't change it!

### Step 7: Save
Click the **"Save"** button at the bottom

### Step 8: Success!
You'll see a success message:
```
✓ Successfully updated auth config
```

---

## Part 4: Test Google Login

### Step 1: Go Back to Your App
Open your POS app in a new tab

### Step 2: Go to Login Page
Navigate to the login page (`/login`)

### Step 3: Click "Continue with Google"
Click the Google button

### Step 4: It Should Work Now!
- Redirects to Google login
- Select your Google account
- Redirects back to your app
- Profile created automatically
- ✅ You're logged in!

---

## 🔍 Can't Find Your Supabase Account?

### Don't Remember How You Signed Up?

Try all login methods:

1. **Try GitHub:**
   - Go to: https://supabase.com/dashboard
   - Click "Continue with GitHub"
   - See if it works

2. **Try Google:**
   - Go to: https://supabase.com/dashboard
   - Click "Continue with Google"
   - See if it works

3. **Try Email:**
   - Go to: https://supabase.com/dashboard
   - Enter your email
   - Click "Continue"
   - Check your email for magic link

### Still Can't Login?

**Check your email** for a message from Supabase when you first created the project. It will tell you:
- Your project URL
- How you signed up
- Your project credentials

---

## 🔐 Don't Have a Supabase Account Yet?

### Create One (Takes 2 Minutes):

1. Go to: https://supabase.com
2. Click **"Start your project"**
3. Choose sign-up method:
   - GitHub (recommended)
   - Google
   - Email
4. Create account
5. Create a new project
6. Wait 2 minutes for setup
7. Follow steps above to enable Google OAuth

**Note**: The current project (`ixqmiskmnhiwvlipxtdk`) is already created, so you should already have an account!

---

## 📸 Visual Guide

### What You'll See:

**Login Page:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━
    Welcome to Supabase
━━━━━━━━━━━━━━━━━━━━━━━━━
  
  [ Continue with GitHub  ]
  [ Continue with Google  ]
  
  Or sign in with email:
  ┌─────────────────────┐
  │ your@email.com      │
  └─────────────────────┘
  
  [      Continue       ]
━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Dashboard After Login:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Supabase Dashboard

Your Projects:
┌────────────────────────────┐
│ universal-pos              │
│ ixqmiskmnhiwvlipxtdk      │
│ Active • 1 day ago         │
└────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Providers Page:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Authentication > Providers

☑ Email (enabled)
☐ Phone
☐ Apple
☐ GitHub
☐ Google          ← Click here!
☐ Facebook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Google Settings:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Google

☑ Enable Sign in with Google

☑ Use development mode
  (No credentials needed)

Redirect URL:
https://ixqmiskmnhiwvlipxtdk.supabase.co/auth/v1/callback

[        Save        ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Quick Checklist

- [ ] Open https://supabase.com/dashboard
- [ ] Login (GitHub/Google/Email)
- [ ] Select project `ixqmiskmnhiwvlipxtdk`
- [ ] Click "Authentication" in sidebar
- [ ] Click "Providers" tab
- [ ] Find "Google" in list
- [ ] Toggle ON "Enable Sign in with Google"
- [ ] Check "Use development mode"
- [ ] Click "Save"
- [ ] Test Google login in your app

---

## 🆘 Need More Help?

### Check Your .env File
Your Supabase credentials are in:
```
/tmp/cc-agent/57687976/project/.env
```

This file has:
- `VITE_SUPABASE_URL` - Your project URL
- `VITE_SUPABASE_ANON_KEY` - Your API key

The URL tells you your project ID!

### Contact Support
If you really can't login:
- Email: support@supabase.com
- Discord: https://discord.supabase.com

---

**Bottom Line**: Go to https://supabase.com/dashboard, login with whatever method you used to create the account (GitHub/Google/Email), find your project, enable Google OAuth provider. That's it! 🎯

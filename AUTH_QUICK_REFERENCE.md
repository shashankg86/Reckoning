# Authentication Flow - Quick Reference Guide

## Key Files Map

```
/src
├── contexts/
│   └── AuthContext.tsx              [Main auth state & logic]
├── api/
│   ├── auth.ts                      [Supabase auth API]
│   ├── stores.ts                    [Store creation]
│   ├── sms.ts                       [OTP verification]
│   ├── onboardingProgress.ts        [Onboarding state persistence]
│   └── profileUtils.ts              [Profile creation helpers]
├── screens/
│   ├── LoginScreen.tsx              [Email/password sign in]
│   ├── SignupScreen.tsx             [Email/password sign up]
│   ├── OnboardingScreen.tsx         [Store setup]
│   ├── PhoneVerificationScreen.tsx  [OTP verification]
│   └── ForgotPasswordScreen.tsx     [Password reset]
├── components/
│   └── Router.tsx                   [Route guards & redirects]
├── routes/
│   └── ProtectedRoutes.tsx          [Alternative route guard]
├── lib/
│   ├── supabaseClient.ts            [Supabase config]
│   └── sessionManager.ts            [Inactivity & token management]
└── types/
    └── index.ts                     [TypeScript interfaces]
```

---

## Critical Decision Points

### 1. IS USER AUTHENTICATED?
```
supabase.auth.getSession()
  ├─ Session exists? → isAuthenticated = true
  └─ No session? → isAuthenticated = false
```

### 2. IS USER ONBOARDED?
```
probeOnboarded(userId)
  ├─ Check: SELECT count(*) FROM store_members 
       WHERE user_id = ? AND is_active = true
  ├─ count > 0? → isOnboarded = true
  └─ count = 0? → isOnboarded = false
```

### 3. WHERE TO ROUTE USER?
```
if (isLoading) → Show spinner

if (!isAuthenticated)
  ├─ Trying /dashboard? → Go to /login
  ├─ Trying /signup? → Show signup form
  └─ Trying /login? → Show login form

if (isAuthenticated && !isOnboarded)
  ├─ Trying /dashboard? → Go to /get-started
  ├─ Trying /get-started? → Show onboarding form
  └─ Trying /login? → Go to /dashboard

if (isAuthenticated && isOnboarded)
  ├─ Trying /login? → Go to /dashboard
  ├─ Trying /get-started? → Go to /dashboard
  └─ Trying /dashboard? → Show dashboard
```

---

## State Machine

```
                    ┌─────────────────────────────────────────┐
                    │         NO SESSION EXISTS               │
                    │  isAuthenticated = false                │
                    │  isOnboarded = false                    │
                    └─────────────────────────────────────────┘
                                    ▲
                                    │ (Logout)
                                    │
                    ┌───────────────┴──────────────────────────┐
                    │                                          │
                    ▼                                          ▼
        ┌──────────────────────┐              ┌──────────────────────┐
        │  AUTHENTICATED       │              │  AUTHENTICATED       │
        │  NOT ONBOARDED       │              │  ONBOARDED           │
        │                      │              │                      │
        │ isAuthenticated=true │              │ isAuthenticated=true │
        │ isOnboarded=false    │              │ isOnboarded=true     │
        │                      │              │                      │
        │ Routes allowed:      │              │ Routes allowed:      │
        │ • /get-started       │              │ • /dashboard         │
        │ • /onboarding        │              │ • /catalog           │
        │ • /login → /get-s..  │              │ • /invoice           │
        │ • /signup → /get-s.. │              │ • /ocr               │
        │                      │              │ • /reports           │
        │                      │              │                      │
        └──────────────────────┘              └──────────────────────┘
                    ▲                                    ▲
                    │ (Complete onboarding)             │
                    │ (Create store & membership)       │
                    │                                   │
                    │                      ┌────────────┘
                    │                      │ (Logout)
                    └──────────────────────┘
```

---

## Profile Creation Timeline

### Email/Password Sign Up:
```
User submits form
    ↓
signUpWithEmail()
    ├─> Check email doesn't exist
    ├─> supabase.auth.signUp() [Creates auth user]
    └─> ensureProfile()        [Creates database profile]
        ├─> INSERT profiles { id, email, name, phone }
        └─> UPSERT (if conflict, just update)
    ↓
Profile now exists in database immediately
```

### Google OAuth (First Time):
```
User clicks "Continue with Google"
    ↓
Google OAuth redirect
    ↓
Return to app with session
    ↓
AuthContext.init() runs
    ├─> Detect Google provider
    ├─> Check email not in use by different user
    └─> ensureProfile()
        └─> INSERT profiles { id, email, name, phone }
    ↓
Profile now exists in database
```

### Google OAuth (Returning User):
```
User clicks "Continue with Google"
    ↓
Google OAuth redirect
    ↓
Return to app with session
    ↓
AuthContext.init() runs
    ├─> Detect Google provider
    ├─> Check email exists
    ├─> Profile already exists → No action needed
    └─> Load existing profile
    ↓
No new profile created
```

---

## Onboarding Creation Timeline

### Store & Membership Creation:
```
User fills onboarding form
    ↓
Submits
    ↓
completeOnboarding(storeData)
    │
    ├─> storesAPI.createStore()
    │   │
    │   ├─> INSERT stores table
    │   │   └─> { name, type, owner_id, logo_url, ... }
    │   │
    │   └─> INSERT store_members table
    │       └─> { store_id, user_id, role: 'owner', is_active: true }
    │
    ├─> onboardingAPI.clear(userId)
    │   └─> DELETE FROM onboarding_progress
    │
    ├─> SET_ONBOARDED(true)
    │
    └─> loadUserProfile() [refresh state]
    ↓
probeOnboarded() now returns TRUE (membership exists)
```

---

## Duplicate Account Prevention

### Scenario: Email signup, then Google

```
Step 1: User signs up with email/password
  ├─> Creates: profiles.id = "auth_uid_1", email = "john@test.com"
  └─> Creates: auth_provider = "email"

Step 2: User tries Google login with same email
  ├─> Google creates NEW Supabase user: auth_uid_2
  └─> Different user ID!

Step 3: AuthContext.init() runs
  ├─> Checks: Is email "john@test.com" in profiles?
  ├─> Yes → but profile.id = "auth_uid_1" (different from current auth_uid_2)
  └─> DETECTED: Different user owns this email!

Step 4: System rejects
  ├─> supabase.auth.signOut() [Logout the Google user]
  ├─> Show error: "This email is already registered with email/password"
  └─> Result: No duplicate profile created
```

**Code location:** AuthContext.tsx lines 188-215 and 279-306

---

## Key Data Relationships

```
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth                                          │
│  ├─ user.id (UUID)                                      │
│  ├─ user.email                                          │
│  └─ user.app_metadata.provider (email|google)           │
└─────────────────────────────────────────────────────────┘
                        │ auth.id
                        ▼
┌─────────────────────────────────────────────────────────┐
│  profiles Table                                         │
│  ├─ id (PRIMARY KEY) = auth.user.id                     │
│  ├─ email (UNIQUE, LOWERCASE)                           │
│  ├─ name                                                │
│  ├─ phone                                               │
│  ├─ photo_url                                           │
│  ├─ auth_provider                                       │
│  ├─ created_at                                          │
│  └─ last_login_at                                       │
└─────────────────────────────────────────────────────────┘
                        │ owner_id
                        ▼
┌─────────────────────────────────────────────────────────┐
│  stores Table                                           │
│  ├─ id (PRIMARY KEY)                                    │
│  ├─ owner_id (FK → profiles.id)                         │
│  ├─ name, type, language, currency, theme              │
│  ├─ address, city, state, country, pincode              │
│  ├─ gst_number, phone, email                            │
│  ├─ logo_url                                            │
│  ├─ is_active                                           │
│  ├─ created_at, updated_at                              │
│  └─ ...                                                 │
└─────────────────────────────────────────────────────────┘
                        │ store_id
                        ▼
┌─────────────────────────────────────────────────────────┐
│  store_members Table (CRITICAL FOR isOnboarded)         │
│  ├─ id (PRIMARY KEY)                                    │
│  ├─ store_id (FK → stores.id)                           │
│  ├─ user_id (FK → profiles.id) ◄── Checked by probe     │
│  ├─ role (owner|manager|cashier)                        │
│  ├─ is_active (TRUE) ◄── Must be active                 │
│  ├─ joined_at, created_at                               │
│  └─ ...                                                 │
└─────────────────────────────────────────────────────────┘
```

**Critical relationship:**
```
probeOnboarded() checks:
  SELECT COUNT(*)
  FROM store_members
  WHERE user_id = ? AND is_active = true

If count > 0 → isOnboarded = true
```

---

## Password Reset Flow

```
ForgotPasswordScreen
    ↓
User enters email
    ↓
resetPassword(email)
    ↓
authAPI.resetPassword(email)
    ├─> supabase.auth.resetPasswordForEmail()
    ├─> Sends email with reset link
    └─> Link redirects to: /reset-password
    ↓
Show confirmation: "Check your email"
    ↓
User clicks link in email
    ├─> Returns to app with code in URL
    └─> (Implementation not shown in provided code)
```

---

## Phone Verification (Optional)

### Prerequisites:
- Environment variable: `VITE_MSG91_AUTH_KEY`
- Environment variable: `VITE_MSG91_TEMPLATE_ID`
- `smsAPI.isConfigured()` returns true

### Flow:
```
SignupScreen.onSubmit()
    ├─> Check email unique
    └─> IF smsAPI.isConfigured()
        └─> Navigate to /phone-verification
            ├─> Automatically send OTP to phone
            ├─> User enters 6 digits
                ├─> Check stored OTP matches
                ├─> Check < 5 minutes old
                ├─> Clear from storage
                └─> Call register() to create account
            └─> Redirect to /get-started
            
    IF SMS NOT CONFIGURED
        └─> Call register() directly (no OTP)
```

**Storage:** OTP stored in localStorage temporarily
- Format: `localStorage['otp_{phone}']`
- Expiry: 5 minutes
- Rate limit: 1 minute between resends

---

## Session Management

### Inactivity Timeout:
- **Timeout:** 15 minutes
- **Warning:** 2 minutes before (at 13 minutes)
- **Reset trigger:** mousedown, mousemove, keypress, scroll, touchstart, click
- **Action on timeout:** Auto-logout with toast message

### Token Refresh:
- **Frequency:** Automatic, 5 minutes before expiry
- **Triggered by:** Auth state change listener
- **Fallback:** If refresh fails → Force logout

### Session Fingerprint:
- **Detects:** Browser, timezone, screen resolution, user agent changes
- **Storage:** sessionStorage['__sf__']
- **Verification:** Before reset on activity, before sensitive operations
- **Action on mismatch:** Force logout with security warning

---

## Error Messages Map

### During Sign Up:
| Condition | Message |
|-----------|---------|
| Email already exists | "This email is already registered. Please log in instead." |
| Password too short | "Password must be at least 8 characters" |
| Passwords don't match | "Passwords do not match" |
| Invalid phone | "Please enter a valid phone number" |
| Name too short | "Name must be at least 2 characters" |
| Signup API error | Re-throw with original error message |

### During Sign In:
| Condition | Message |
|-----------|---------|
| Wrong credentials | "Invalid email or password. Please try again." |
| Email not verified | "Please verify your email before logging in." |
| Profile missing | "No account found. Please sign up first." |
| Profile not found after retries | "Account profile not found. Please sign up first." + Auto-logout |

### During Google OAuth:
| Condition | Message |
|-----------|---------|
| Email already used by different auth | "This email is already registered with [email/password\|google]..." |
| OAuth error | "Failed to login with Google" |
| Duplicate account detected | "This email is already registered..." + Auto-logout |

### During Phone Verification:
| Condition | Message |
|-----------|---------|
| OTP never sent | "OTP expired or not found. Please request a new OTP." |
| OTP incorrect | "Invalid OTP. Please check and try again." |
| OTP expired (>5min) | "OTP expired. Please request a new OTP." |
| Too frequent resend | "Please wait X seconds before requesting another OTP." |

### During Onboarding:
| Condition | Message |
|-----------|---------|
| Invalid GSTIN | "Invalid GSTIN format. Example: 29ABCDE1234F1Z5" |
| Logo upload error | "Failed to upload logo. Please try again." |
| Store creation error | "Failed to complete setup. Please try again." |

### Session Errors:
| Condition | Message |
|-----------|---------|
| Session hijacking detected | "Security alert: Session anomaly detected. Please log in again." |
| Inactivity timeout | "Session expired due to inactivity. Please log in again." |
| Session warning | "Your session will expire in 2 minutes due to inactivity" |
| Token refresh failed | "Session refresh failed. Please log in again." |

---

## Loading State Management

```
AuthState.isLoading = true
    ├─> During init() - Until session fully loaded
    ├─> During login() - Until profile loaded
    ├─> During signup() - Until profile created
    └─> Forced to false after 5 seconds [Safety timeout]

AuthState.isLoading = false
    ├─> After init() completes
    ├─> After probeOnboarded() completes
    ├─> After loadUserProfile() completes
    ├─> When error occurs
    └─> After 5-second safety timeout
```

**Router behavior when loading:**
```
if (isLoading) → Show <LoadingScreen /> spinner
```

---

## URL-Based Routing Examples

| URL | State | Result |
|-----|-------|--------|
| `/login` | Not auth | Show login form |
| `/login` | Authenticated, not onboarded | Redirect to `/get-started` |
| `/login` | Authenticated, onboarded | Redirect to `/dashboard` |
| `/signup` | Not auth | Show signup form |
| `/signup` | Authenticated, not onboarded | Redirect to `/get-started` |
| `/signup` | Authenticated, onboarded | Redirect to `/dashboard` |
| `/get-started` | Not auth | Redirect to `/login` |
| `/get-started` | Authenticated, not onboarded | Show onboarding form |
| `/get-started` | Authenticated, onboarded | Redirect to `/dashboard` |
| `/dashboard` | Not auth | Redirect to `/login` |
| `/dashboard` | Authenticated, not onboarded | Redirect to `/get-started` |
| `/dashboard` | Authenticated, onboarded | Show dashboard |
| `/phone-verification` | Not auth or fully onboarded | Show verification or redirect |
| `/unknown` | Any state | Try to redirect to `/dashboard` (may chain-redirect based on state) |


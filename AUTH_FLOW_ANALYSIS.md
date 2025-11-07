# Complete Authentication Flow Analysis - Reckoning POS Application

## Overview
This application uses Supabase for authentication with support for:
- Email/Password authentication
- Google OAuth
- Phone verification (optional SMS gateway via MSG91)
- Email-based password reset
- Session management with inactivity timeout
- Onboarding workflow

---

## 1. SIGN IN FLOW (Email/Password)

### Entry Point: LoginScreen.tsx
**Path:** `/login`

#### User Actions:
1. User enters email and password
2. Form validation via Zod schema
3. Submit button triggers `login()` from AuthContext

### Backend Flow:

#### Step 1: AuthContext.login() - AuthContext.tsx (Line 354-389)
```typescript
const login = async (email: string, password: string): Promise<boolean> => {
  // 1. Clear any previous errors
  dispatch({ type: 'CLEAR_ERROR' });
  
  // 2. Call API to authenticate with Supabase
  const { user } = await authAPI.loginWithEmail(email, password);
  
  // 3. Set authenticated session state
  dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email } });
  
  // 4. Fast membership probe to check if onboarded
  let onboarded = false;
  const probePromise = probeOnboarded(user.id);
  const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
  onboarded = await Promise.race([probePromise, timeoutPromise]);
  
  dispatch({ type: 'SET_ONBOARDED', payload: onboarded });
  
  // 5. Load full profile in background
  loadUserProfile(user.id, user.email ?? null, { force: true });
  
  return true;
}
```

#### Step 2: authAPI.loginWithEmail() - auth.ts (Line 103-155)
1. **Calls Supabase:** `supabase.auth.signInWithPassword()`
2. **Profile Validation:** Checks if user has a profile in `profiles` table
   - If profile exists: Updates `last_login_at` timestamp
   - If profile missing: Logs user out and throws error "No account found"
3. **Returns:** User object and session

**Critical Validation:**
```typescript
// Must have profile in database - email/password users MUST sign up first
if (!profile) {
  await supabase.auth.signOut();
  throw new Error('No account found. Please sign up first.');
}
```

#### Step 3: AuthContext.loadUserProfile() - AuthContext.tsx (Line 109-164)
- Fetches complete profile from `profiles` table
- Fetches user's stores via `storesAPI.getUserStores()`
- Determines `isOnboarded` status: `!!userStore`
- Retries up to 40 seconds with exponential backoff if profile not found
- **Safety timeout:** Forces loading to false after 5 seconds

### Post-Login Navigation:
- **Router logic** (Router.tsx - ProtectedRoute):
  - If `isOnboarded = true` → Redirects to `/dashboard`
  - If `isOnboarded = false` → Redirects to `/get-started` (onboarding)

### Error Handling:
- Invalid credentials: "Invalid email or password"
- Email not verified: "Please verify your email before logging in"
- Account not found: "No account found. Please sign up first"

---

## 2. SIGN IN FLOW (Google OAuth)

### Entry Point: LoginScreen.tsx
**Button:** "Continue with Google"

### Backend Flow:

#### Step 1: LoginScreen calls loginWithGoogle()
Triggers `authAPI.loginWithGoogle()` from AuthContext

#### Step 2: authAPI.loginWithGoogle() - auth.ts (Line 157-176)
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```
- Opens Google OAuth consent screen
- After authorization, redirects back to app with auth token

#### Step 3: Session Detection in AuthContext.init() - AuthContext.tsx (Line 166-257)

When app initializes or user returns from Google OAuth:

**A. Supabase Session Check:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) return; // Not authenticated
```

**B. Provisional Auth:**
```typescript
dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email: session.user.email } });
```

**C. Profile Existence Check & Creation (CRITICAL):**
```typescript
if (session.user.app_metadata.provider === 'google') {
  // Check if email already exists with different user ID (duplicate account prevention)
  const emailExists = await authAPI.checkEmailExists(userEmail);
  if (emailExists) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, auth_provider')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();
    
    // If different user has this email - DUPLICATE DETECTED!
    if (existingProfile && existingProfile.id !== uid) {
      // Logout and show error
      const providerName = existingProfile.auth_provider === 'email' ? 'email/password' : existingProfile.auth_provider;
      toast.error(`This email is already registered with ${providerName}`);
      return;
    }
  }
  
  // No duplicate - proceed with profile creation
  const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
  const phone = session.user.user_metadata?.phone || '';
  await authAPI.ensureProfile(uid, session.user.email, name, phone);
}
```

**D. Onboarding Probe & Profile Load:**
```typescript
let onboarded = await Promise.race([
  probeOnboarded(uid),
  new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
]);
dispatch({ type: 'SET_ONBOARDED', payload: onboarded });
loadUserProfile(uid, session.user.email ?? null, { force: true });
```

#### Step 4: authAPI.ensureProfile() - auth.ts (Line 31-57)
Creates or updates user profile in `profiles` table:
```typescript
const profileData = {
  id: userId,
  email: email?.toLowerCase() || null,
  name: name || email?.split('@')[0] || 'User',
  phone: phone || '',
  last_login_at: new Date().toISOString(),
};

const { data, error } = await supabase
  .from('profiles')
  .upsert(profileData, { onConflict: 'id' })
  .select()
  .single();
```

### Duplicate Account Prevention:
**Exact Scenario:**
1. User signs up with email/password: `john@example.com`
2. Later, same user tries to sign in with Google using same email
3. **What happens:**
   - Google OAuth creates new Supabase user (different `uid`)
   - During init, app detects `john@example.com` already exists
   - Finds existing profile belongs to different user
   - Logs out Google user and shows error
   - Message: "This email is already registered with email/password. Please sign in using email/password instead."

### Post-Google-Login Navigation:
Same as email/password login - determined by `isOnboarded` status

---

## 3. SIGN UP FLOW (Email/Password)

### Entry Point: SignupScreen.tsx
**Path:** `/signup`

#### User Actions:
1. Enter: Name, Phone, Email, Password, Confirm Password
2. Phone validation via `isPossiblePhoneNumber()`
3. Form validation via Zod schema
4. Submit button triggers signup flow

### Backend Flow:

#### Step 1: SignupScreen.onSubmit() - SignupScreen.tsx (Line 46-73)

```typescript
const onSubmit = async (data: SignupFormData) => {
  // 1. Check if email already exists
  const emailExists = await authAPI.checkEmailExists(data.email);
  if (emailExists) {
    toast.error('This email is already registered. Please log in instead.');
    navigate('/login', { state: { email: data.email } });
    return;
  }
  
  // 2. If SMS configured: Go through phone verification
  if (smsAPI.isConfigured()) {
    navigate('/phone-verification', { 
      state: { 
        phone: data.phone, 
        email: data.email, 
        name: data.name, 
        password: data.password, 
        isSignup: true 
      } 
    });
  } else {
    // 3. Direct signup (no SMS verification)
    const result = await authRegister(data.email, data.password, data.name, data.phone);
    if (result.session?.user) {
      await ensureMinimalProfile(result.session.user.id, data.email, data.name, data.phone);
    }
  }
}
```

#### Step 2A: With Phone Verification (SMS Configured)
**Routes to:** `/phone-verification`

Passes state with signup data.

#### Step 2B: Direct Signup (SMS Not Configured)
Calls `authContext.register()` → `authAPI.signUpWithEmail()`

#### Step 3: authAPI.signUpWithEmail() - auth.ts (Line 59-101)

```typescript
async signUpWithEmail(email: string, password: string, name: string, phone: string) {
  // 1. Double-check email doesn't exist
  const emailExists = await this.checkEmailExists(email);
  if (emailExists) {
    throw new Error('This email is already registered...');
  }
  
  // 2. Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
      },
    },
  });
  
  // 3. IMMEDIATELY create profile in profiles table
  if (data.user) {
    await this.ensureProfile(data.user.id, email, name, phone);
  }
  
  return { user: data.user, session: data.session };
}
```

**Key Point:** Profile is created **immediately** after Supabase auth user creation.

#### Step 4: AuthContext.register() - AuthContext.tsx (Line 400-415)

```typescript
const register = async (email: string, password: string, name: string, phone?: string) => {
  // 1. Call signup API
  const { user } = await authAPI.signUpWithEmail(email, password, name, phone || '');
  
  // 2. Set authenticated state
  dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email } });
  
  // 3. Mark as NOT onboarded yet
  dispatch({ type: 'SET_ONBOARDED', payload: false });
  
  // 4. Load profile in background
  loadUserProfile(user.id, user.email ?? null, { force: true });
  
  toast.success('Account created successfully! Welcome!');
}
```

### Post-Signup Navigation:
- **Router redirects** to `/get-started` (onboarding)
- Because `isOnboarded = false`

---

## 4. SIGN UP FLOW (Google OAuth)

### Entry Point: SignupScreen.tsx
**Button:** "Continue with Google"

### Backend Flow:

Same as Google Sign In, but:
1. Creates **new** Supabase user (doesn't find existing)
2. Creates profile for first time
3. `isOnboarded = false` (no stores yet)
4. **Redirects to:** `/get-started` (onboarding)

### Flow Diagram:
```
SignupScreen → "Continue with Google"
    ↓
authAPI.loginWithGoogle()
    ↓
Google OAuth Redirect
    ↓
Return to App
    ↓
AuthContext.init() detects SIGNED_IN event
    ↓
Check if email exists in profiles
    ↓
Email doesn't exist → Create new profile via ensureProfile()
    ↓
probeOnboarded() = false (no store_members)
    ↓
Router redirects to /get-started
```

---

## 5. PHONE VERIFICATION FLOW (Optional)

### Entry Point: PhoneVerificationScreen.tsx
**Triggered by:** SignupScreen when SMS configured

### Prerequisites:
- `VITE_MSG91_AUTH_KEY` environment variable must be set
- `VITE_MSG91_TEMPLATE_ID` must be configured
- `smsAPI.isConfigured()` returns `true`

### Backend Flow:

#### Step 1: Component Mounts
```typescript
// Send initial OTP
const sendInitialOTP = async () => {
  const result = await smsAPI.sendOTP(locationState.phone);
  // OTP is stored in localStorage with timestamp
}
```

#### Step 2: smsAPI.sendOTP() - sms.ts (Line 36-89)

```typescript
async sendOTP(phone: string, otpLength: number = 6) {
  // 1. Clean phone number (remove country code, spaces)
  const cleanPhone = this.cleanPhoneNumber(phone);
  
  // 2. Generate 6-digit OTP
  const otp = this.generateOTP(6);
  
  // 3. Send via MSG91 API
  const payload = {
    template_id: this.config.templateId,
    sender: this.config.sender,
    mobiles: `91${cleanPhone}`, // Add India country code
    var1: otp,
    var2: 'Reckoning POS',
    route: '4', // Transactional route
  };
  
  const response = await fetch(`https://api.msg91.com/api/v5/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authkey': this.config.authKey,
    },
    body: JSON.stringify(payload),
  });
  
  // 4. Store OTP temporarily in localStorage (for verification)
  this.storeOTPTemporarily(cleanPhone, otp);
  
  return { success: true, message: 'OTP sent successfully' };
}
```

#### Step 3: User Enters OTP
User inputs 6 digits in OTPInput component

#### Step 4: Verification - smsAPI.verifyOTP() - sms.ts (Line 94-143)

```typescript
async verifyOTP(phone: string, enteredOTP: string) {
  const cleanPhone = this.cleanPhoneNumber(phone);
  const storedOTP = this.getStoredOTP(cleanPhone);
  
  // 1. Check if OTP exists
  if (!storedOTP) {
    throw new Error('OTP expired or not found');
  }
  
  // 2. Verify OTP matches
  if (storedOTP.otp !== enteredOTP) {
    throw new Error('Invalid OTP. Please check and try again.');
  }
  
  // 3. Check if OTP still valid (5-minute expiry)
  const otpAge = Date.now() - storedOTP.timestamp;
  if (otpAge > 5 * 60 * 1000) {
    this.clearStoredOTP(cleanPhone);
    throw new Error('OTP expired. Please request a new OTP.');
  }
  
  // 4. OTP is valid - clear it from storage
  this.clearStoredOTP(cleanPhone);
  return { success: true, message: 'Phone number verified successfully!' };
}
```

#### Step 5: After Verification - PhoneVerificationScreen.tsx (Line 70-108)

```typescript
if (locationState.isSignup && locationState.password) {
  // Call register() with verified phone
  await register(
    locationState.email,
    locationState.password,
    locationState.name,
    locationState.phone
  );
  // User redirected to onboarding by AuthContext
}
```

### SMS Rate Limiting:
```typescript
// 1-minute cooldown between OTP requests
const cooldown = 60 * 1000;
if (timeSinceLastSent < cooldown) {
  const remainingTime = Math.ceil((cooldown - timeSinceLastSent) / 1000);
  throw new Error(`Please wait ${remainingTime} seconds...`);
}
```

---

## 6. ONBOARDING FLOW

### Entry Point: OnboardingScreen.tsx
**Path:** `/get-started` or `/onboarding`

### Redirect Trigger (Router.tsx):
```typescript
function ProtectedRoute({ children }) {
  const { state } = useAuth();
  
  if (!state.isOnboarded) {
    return <Navigate to="/get-started" replace />;
  }
  
  return <>{children}</>;
}
```

Users are **forced** to `/get-started` if:
- `isAuthenticated = true`
- `isOnboarded = false`

### Onboarding Flow Steps:

#### Step 1: Load Saved Progress (Optional Resume)
```typescript
React.useEffect(() => {
  const savedProgress = await onboardingAPI.get(state.user!.uid);
  if (savedProgress?.data) {
    // Pre-fill form with saved data
    reset(mergedData);
  }
}, [state.user]);
```

#### Step 2: Form Structure
```typescript
// Three sections:
1. LogoUpload - Store logo with preview
2. StoreBasics - Name, Type, Address, City, State, Pincode, GSTIN
3. StoreContacts - Phone, Email, Secondary Phone
```

#### Step 3: Auto-Save Progress
- Triggered on field blur
- Saves to `onboarding_progress` table
- Allows users to resume later
- Also auto-saves on page unload

#### Step 4: Logo Upload
```typescript
// If logo file selected:
1. Upload to Supabase storage at `store-logos/{userId}-{timestamp}.ext`
2. Get public URL
3. Store URL in form data
```

#### Step 5: Form Submission - OnboardingScreen.tsx (Line 167-197)

```typescript
const onSubmit = async (data: OnboardingFormData) => {
  // 1. Upload logo if new file selected
  let logoUrl = logoPreview;
  if (logoFile) {
    const uploadedUrl = await uploadLogo();
    if (uploadedUrl) logoUrl = uploadedUrl;
  }
  
  // 2. Create store object
  const storeData: Store = {
    name: data.name,
    type: data.type,
    language: data.language,
    currency: data.currency,
    theme: data.theme,
    logoURL: logoUrl ?? undefined,
  };
  
  // 3. Complete onboarding
  await completeOnboarding(storeData);
  
  // 4. Clear saved progress
  if (state.user) await onboardingAPI.clear(state.user.uid);
  
  // 5. Redirect to dashboard
  navigate('/dashboard', { replace: true });
}
```

#### Step 6: completeOnboarding() - AuthContext.tsx (Line 439-465)

```typescript
const completeOnboarding = async (storeData: Store) => {
  // 1. Create store in database
  const created = await storesAPI.createStore(storeData);
  
  // 2. Clear onboarding progress
  await onboardingAPI.clear(state.user.uid);
  
  // 3. Update local state
  dispatch({ type: 'SET_ONBOARDED', payload: true });
  dispatch({ type: 'SET_USER', payload: { ...state.user, store: created } });
  
  // 4. Load profile in background to refresh
  loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });
  
  toast.success('Store setup completed!');
}
```

#### Step 7: storesAPI.createStore() - stores.ts (Line 22-67)

**Creates two database records:**

**A. Insert into `stores` table:**
```typescript
const { data: store } = await supabase
  .from('stores')
  .insert({
    name: storeData.name,
    type: storeData.type,
    language: storeData.language,
    currency: storeData.currency,
    theme: storeData.theme,
    address: storeData.address,
    city: storeData.city,
    state: storeData.state,
    country: storeData.country,
    pincode: storeData.pincode,
    gst_number: storeData.gst_number,
    phone: storeData.phone,
    email: storeData.email,
    logo_url: storeData.logoURL || BRAND.LOGO_URL,
    owner_id: user.data.user.id,
  })
  .select()
  .single();
```

**B. Insert into `store_members` table:**
```typescript
const { error: memberError } = await supabase
  .from('store_members')
  .insert({
    store_id: store.id,
    user_id: user.data.user.id,
    role: 'owner',
    is_active: true,
  });
```

This membership record is **critical** because:
- `probeOnboarded()` checks `store_members` table with `is_active = true`
- If at least one membership exists → `isOnboarded = true`

### Post-Onboarding:
- `isOnboarded` state becomes `true`
- User redirected to `/dashboard`
- Profile now includes store reference
- Next login will detect store and skip onboarding

---

## 7. PROFILE CREATION LOGIC

### When Profiles Are Created:

#### A. Email/Password Signup:
```
signUpWithEmail() → ensureProfile() → INSERT/UPSERT into profiles
                    (Immediate, before returning)
```

#### B. Google OAuth (First Time):
```
AuthContext.init() detects OAuth provider → ensureProfile() → INSERT/UPSERT into profiles
                    (Immediate after detecting Google provider)
```

#### C. Google OAuth (Returning User):
```
App checks session → Profile already exists → No creation needed
```

### ensureProfile() Logic - auth.ts (Line 31-57)

```typescript
async ensureProfile(userId: string, email: string | null, name?: string, phone?: string) {
  const profileData = {
    id: userId,                          // Primary key = Supabase user ID
    email: email?.toLowerCase() || null, // Normalized email
    name: name || email?.split('@')[0] || 'User', // Fallback to email prefix
    phone: phone || '',
    last_login_at: new Date().toISOString(),
  };
  
  // UPSERT - insert if not exists, update if exists
  const { data } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single();
}
```

### profile Columns (From supabaseClient.ts):
```typescript
id: string;                    // Supabase user ID
email: string;                 // Normalized lowercase
phone: string;
name: string;
photo_url: string | null;
created_at: string;            // Auto-generated
last_login_at: string;         // Updated on every login
```

### Critical: Duplicate Prevention (Email/Password + Google)

**Scenario 1: Email signup, then Google with same email**
```
1. Email signup creates: profiles.id = "auth_user_1", email = "john@test.com"
2. Google OAuth would create: new Supabase user (different ID)
3. AuthContext.init() checks: checkEmailExists("john@test.com") = true
4. Finds existing profile belongs to different user_id
5. Logs out Google user and shows error
6. Result: No duplicate profile created
```

**Database check:**
```typescript
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id, auth_provider')
  .eq('email', userEmail.toLowerCase())
  .maybeSingle();

if (existingProfile && existingProfile.id !== uid) {
  // Different user has this email - REJECT
  throw new Error(`This email is already registered with ${existingProfile.auth_provider}`);
}
```

---

## 8. AUTHENTICATION STATE MANAGEMENT

### AuthContext Structure - AuthContext.tsx

#### AuthState:
```typescript
interface AuthState {
  user: User | null;                 // Full user object
  isLoading: boolean;                // Loading spinner state
  isAuthenticated: boolean;          // Session exists
  isOnboarded: boolean;              // Has store
  error: string | null;              // Error messages
}
```

#### Auth Actions (Reducer):
1. `SET_LOADING` - Show/hide spinner
2. `SET_USER` - Set full user profile
3. `SET_AUTH_SESSION_PRESENT` - Provisional auth (uid + email only)
4. `SET_ONBOARDED` - Mark user as having completed onboarding
5. `SET_ERROR` - Set error message
6. `CLEAR_ERROR` - Clear error
7. `LOGOUT` - Clear all auth state

### How isOnboarded Is Determined:

#### Method 1: Store Existence Check (Primary)
```typescript
async function probeOnboarded(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('store_members')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_active', true);
  return (count ?? 0) > 0;
}
```

**Logic:** If user has at least one active store_membership → `isOnboarded = true`

#### Method 2: Store Object Check (Secondary)
```typescript
// In loadUserProfile():
const user: User = {
  ...
  isOnboarded: !!userStore,  // If store exists → onboarded
  store: userStore,
}
```

### Initialization Flow - AuthContext.tsx (Line 166-257)

```
App Mounts
  ↓
AuthProvider initializes
  ↓
useEffect calls init()
  ↓
1. Get current session from Supabase
  ├─ No session? → SET_LOADING(false), return
  └─ Session exists → Continue
  ↓
2. Set provisional auth: SET_AUTH_SESSION_PRESENT
  ↓
3. If Google OAuth:
  ├─ Check for duplicate email
  ├─ If duplicate → Logout and error
  └─ If no duplicate → Create profile via ensureProfile()
  ↓
4. Probe onboarded status: probeOnboarded()
  ├─ With 3-second timeout protection
  └─ SET_ONBOARDED
  ↓
5. ALWAYS clear loading: dispatch({ type: 'SET_ONBOARDED' })
  └─ Prevents infinite loader even if probe times out
  ↓
6. Load full profile in background (non-blocking)
  ↓
7. Setup auth state change listener
```

### Auth State Change Listener - AuthContext.tsx (Line 259-349)

Listens to Supabase `onAuthStateChange` events:

**Event: SIGNED_IN**
```typescript
if (event === 'SIGNED_IN' && uid) {
  if (lastUserIdRef.current !== uid) {
    // Skip for email users (handled by login() function)
    if (session!.user!.app_metadata.provider === 'email') {
      return;
    }
    
    // For OAuth: Set auth + create profile + probe onboarded
    // Same logic as init()
  }
}
```

**Event: TOKEN_REFRESHED**
- Just log, don't update state

**Event: USER_UPDATED**
- Reload profile in background

**Event: SIGNED_OUT**
- Clear all auth state and refs

### Profile Loading - AuthContext.tsx (Line 109-164)

```typescript
const loadUserProfile = async (userId: string, email: string | null, opts?: { force?: boolean }) => {
  // Caching: Skip if same user loaded < 30 seconds ago (unless force: true)
  if (!opts?.force) {
    if (now - lastProfileLoadAtRef.current < 30_000 && lastUserIdRef.current === userId) {
      return;
    }
  }
  
  // Retry logic: Try up to 40 seconds with exponential backoff
  const maxMs = 40_000;
  while (Date.now() - startsAt < maxMs) {
    attempt++;
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!error && profile) {
      // Found profile - build user object
      const stores = await storesAPI.getUserStores();
      const userStore = stores && stores.length > 0 ? stores[0] : undefined;
      
      const user: User = {
        uid: profile.id,
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        photoURL: profile.photo_url,
        isOnboarded: !!userStore,    // Has store = onboarded
        store: userStore,
        createdAt: new Date(profile.created_at),
        lastLoginAt: new Date(profile.last_login_at),
      };
      
      dispatch({ type: 'SET_USER', payload: user });
      return;
    }
    
    // Not found yet - retry with backoff
    const delay = Math.min(300 * 2 ** attempt, 3000);
    await new Promise((r) => setTimeout(r, delay));
  }
  
  // CRITICAL: Profile not found after retries
  console.error('Profile not found after retries');
  toast.error('Account profile not found. Please sign up first.');
  await authAPI.logout();
  dispatch({ type: 'LOGOUT' });
}
```

**Key points:**
- Retries if profile not immediately available (race condition protection)
- Exponential backoff: 300ms, 600ms, 1200ms, 2400ms, 3000ms, 3000ms...
- If still not found → Force logout
- Caching prevents excessive queries (30-second TTL)

---

## 9. ROUTE PROTECTION LOGIC

### Router.tsx Route Guards

#### ProtectedRoute (App Routes)
Protects: `/dashboard`, `/catalog`, `/invoice`, `/ocr`, `/reports`

```typescript
function ProtectedRoute({ children }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!state.isOnboarded) {
    return <Navigate to="/get-started" replace />;
  }
  
  return <>{children}</>;
}
```

**Flow:**
1. Still loading? → Show spinner
2. Not logged in? → Go to login
3. Logged in but not onboarded? → Force onboarding
4. Logged in AND onboarded? → Show app

#### AuthRoute (Sign In/Sign Up)
Protects: `/login`, `/signup`, `/forgot-password`

```typescript
function AuthRoute({ children }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (state.isAuthenticated) {
    if (state.isOnboarded) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/get-started" replace />;
  }
  
  return <>{children}</>;
}
```

**Flow:**
1. Still loading? → Show spinner
2. Already logged in AND onboarded? → Go to dashboard
3. Already logged in but NOT onboarded? → Force onboarding
4. Not logged in? → Show login/signup form

#### OnboardingRoute
Protects: `/get-started`, `/onboarding`

```typescript
function OnboardingRoute({ children }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (state.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
```

**Flow:**
1. Still loading? → Show spinner
2. Not logged in? → Go to login
3. Already onboarded? → Go to dashboard
4. Logged in but NOT onboarded? → Show onboarding form

#### VerificationRoute
Protects: `/phone-verification`

```typescript
function VerificationRoute({ children }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (state.isAuthenticated && state.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
```

### Default Route Redirect
```typescript
<Route path="/" element={<Navigate to="/dashboard" replace />} />
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

Any unknown route → Tries to go to `/dashboard`
- If not authenticated → Protected route redirects to `/login`
- If not onboarded → Protected route redirects to `/get-started`

---

## 10. SESSION MANAGEMENT

### SessionManager - sessionManager.ts

#### Responsibilities:
1. **Inactivity Timeout:** 15 minutes auto-logout
2. **Token Refresh:** Auto-refresh 5 minutes before expiry
3. **Session Fingerprint:** Detect session hijacking
4. **Activity Detection:** Reset timer on user activity

#### Initialization:
```typescript
sessionManager.initialize(onSessionExpired: () => void)
```

#### Session Fingerprint:
```typescript
private generateFingerprint(): void {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
  };
  
  // Simple hash
  const hash = JSON.stringify(fingerprint).split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  this.sessionFingerprint = hash.toString(36);
  sessionStorage.setItem('__sf__', this.sessionFingerprint);
}
```

**Detects:** Browser change, timezone change, screen resolution change
**Action:** Warns and requires re-login

#### Inactivity Timeout:
```typescript
setupActivityListeners(): void {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const resetInactivityTimer = () => {
    // Verify session still valid
    if (!this.verifySessionIntegrity()) return;
    
    // Clear existing timers
    clearTimeout(this.inactivityTimer);
    clearTimeout(this.warningTimer);
    
    // Set warning (2 min before logout)
    this.warningTimer = setTimeout(() => {
      toast.warning('Your session will expire in 2 minutes due to inactivity');
    }, 13 * 60 * 1000); // 13 minutes
    
    // Set logout timer
    this.inactivityTimer = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      this.destroySession();
    }, 15 * 60 * 1000); // 15 minutes
  };
  
  // Attach listeners
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });
}
```

#### Token Refresh:
```typescript
private scheduleNextRefresh(session: any): void {
  if (!session?.expires_at) return;
  
  const expiresAt = session.expires_at * 1000;
  const now = Date.now();
  const timeUntilRefresh = expiresAt - now - (5 * 60 * 1000); // 5 min before
  
  if (timeUntilRefresh > 0) {
    this.tokenRefreshTimer = setTimeout(async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        toast.error('Session refresh failed');
        this.destroySession();
      }
    }, timeUntilRefresh);
  }
}
```

---

## 11. COMPLETE FLOW DIAGRAMS

### Email/Password Sign In Flow:
```
LoginScreen
  │
  └─> login(email, password)
      │
      ├─> authAPI.loginWithEmail()
      │   ├─> supabase.auth.signInWithPassword()
      │   ├─> Check profile exists (CRITICAL)
      │   └─> Update last_login_at
      │
      ├─> SET_AUTH_SESSION_PRESENT (provisional)
      │
      ├─> probeOnboarded(userId)
      │   └─> Check store_members count > 0
      │
      ├─> SET_ONBOARDED (true/false)
      │
      ├─> loadUserProfile() [background]
      │   ├─> Fetch from profiles table
      │   ├─> Fetch user stores
      │   └─> SET_USER
      │
      └─> Router checks state
          ├─> If onboarded → /dashboard
          └─> If NOT onboarded → /get-started
```

### Google OAuth First-Time Sign Up:
```
SignupScreen / LoginScreen
  │
  └─> loginWithGoogle()
      │
      ├─> supabase.auth.signInWithOAuth('google')
      │   └─> Redirect to Google consent
      │
      ├─> Return to app with token
      │
      └─> AuthContext detects session change
          │
          ├─> Check if email exists in profiles
          │   ├─> If exists + different user → REJECT
          │   └─> If exists + same user → continue
          │
          ├─> ensureProfile() [creates profile]
          │   └─> INSERT into profiles table
          │
          ├─> probeOnboarded()
          │   └─> Check store_members count = 0
          │
          ├─> SET_ONBOARDED(false)
          │
          └─> Router redirects to /get-started
```

### Email/Password Sign Up with Phone Verification:
```
SignupScreen
  │
  ├─> Check email not exists
  │
  └─> Navigate to PhoneVerificationScreen
      │
      ├─> smsAPI.sendOTP(phone)
      │   ├─> Generate 6-digit OTP
      │   ├─> Send via MSG91 API
      │   └─> Store in localStorage
      │
      ├─> User enters OTP
      │
      ├─> smsAPI.verifyOTP()
      │   ├─> Check stored OTP matches
      │   ├─> Check < 5 min old
      │   └─> Clear localStorage
      │
      └─> authContext.register()
          │
          ├─> authAPI.signUpWithEmail()
          │   ├─> Create Supabase auth user
          │   ├─> ensureProfile()
          │   └─> Return { user, session }
          │
          ├─> SET_AUTH_SESSION_PRESENT
          ├─> SET_ONBOARDED(false)
          ├─> loadUserProfile() [background]
          │
          └─> Router redirects to /get-started
```

### Complete Onboarding Flow:
```
OnboardingScreen (/get-started)
  │
  ├─> Load saved progress [optional]
  │   └─> onboardingAPI.get(userId)
  │
  ├─> User fills form
  │   ├─> Store name, type, address, etc.
  │   ├─> Logo upload to storage
  │   └─> Auto-save on blur
  │
  ├─> Submit
  │   │
  │   ├─> Upload logo to Supabase storage
  │   │
  │   └─> completeOnboarding(storeData)
  │       │
  │       ├─> storesAPI.createStore()
  │       │   │
  │       │   ├─> INSERT into stores table
  │       │   │   └─> owner_id = userId
  │       │   │
  │       │   └─> INSERT into store_members table
  │       │       ├─> store_id = store.id
  │       │       ├─> user_id = userId
  │       │       └─> role = 'owner'
  │       │
  │       ├─> onboardingAPI.clear(userId)
  │       │   └─> DELETE from onboarding_progress
  │       │
  │       ├─> SET_ONBOARDED(true)
  │       ├─> SET_USER with store reference
  │       │
  │       └─> loadUserProfile() [background]
  │
  └─> Router redirects to /dashboard
```

---

## 12. DATABASE SCHEMA (Key Tables)

### profiles
```
id                VARCHAR  PRIMARY KEY    (Supabase user.id)
email             VARCHAR  UNIQUE         (Normalized lowercase)
phone             VARCHAR
name              VARCHAR
photo_url         VARCHAR  NULLABLE
auth_provider     VARCHAR                 ('email' or 'google')
created_at        TIMESTAMP               (Auto)
last_login_at     TIMESTAMP               (Updated on each login)
```

### stores
```
id                VARCHAR  PRIMARY KEY
owner_id          VARCHAR  (FK to profiles.id)
name              VARCHAR
type              VARCHAR  ('restaurant', 'cafe', etc.)
language          VARCHAR  ('en', 'hi', etc.)
currency          VARCHAR  ('INR', etc.)
theme             VARCHAR  ('light', 'dark')
logo_url          VARCHAR  NULLABLE
address           VARCHAR
city              VARCHAR
state             VARCHAR
country           VARCHAR
pincode           VARCHAR
gst_number        VARCHAR  NULLABLE
phone             VARCHAR
email             VARCHAR
is_active         BOOLEAN
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### store_members
```
id                VARCHAR  PRIMARY KEY
store_id          VARCHAR  (FK to stores.id)
user_id           VARCHAR  (FK to profiles.id)
role              VARCHAR  ('owner', 'manager', 'cashier')
is_active         BOOLEAN
invited_by        VARCHAR  NULLABLE
invited_at        TIMESTAMP NULLABLE
joined_at         TIMESTAMP
created_at        TIMESTAMP
```

### onboarding_progress
```
user_id           VARCHAR  PRIMARY KEY    (FK to profiles.id)
current_step      VARCHAR  ('basics', 'contacts', 'review')
data              JSONB                   (Form data)
updated_at        TIMESTAMP
```

---

## 13. SECURITY FEATURES

### 1. Email/Password Validation
- Profile must exist in database (prevents unauthorized Supabase auth users)
- Email normalized to lowercase
- Double email-existence check before signup

### 2. Duplicate Account Prevention (Email/Password + Google)
- Check if email exists in profiles table
- Verify it belongs to same user_id as current auth session
- If different user owns email → Reject with clear error message
- Shows which auth method the email is registered with

### 3. Session Fingerprinting
- Browser fingerprint (user agent, screen, timezone, etc.)
- Detected changes trigger re-authentication
- Protects against session hijacking

### 4. Inactivity Timeout
- Auto-logout after 15 minutes
- Warning at 13 minutes
- Activity detection resets timer

### 5. Token Auto-Refresh
- Automatic refresh 5 minutes before expiry
- Seamless session continuation
- Handled by session manager

### 6. Secure OAuth Flow
- PKCE flow for enhanced security (configured in supabaseClient.ts)
- No direct client secret exposure
- Uses Supabase managed auth

### 7. Encrypted Storage
- Session tokens stored in encrypted storage (secureStorage)
- Not in plain localStorage
- Configured via `storageKey: 'sb-auth-token'`

---

## 14. KEY CONDITIONS FOR ONBOARDING REDIRECT

User lands on onboarding page when:
1. **isAuthenticated = true** (Logged in)
2. **isOnboarded = false** (No active store_members record)

Determined by:
```typescript
// In probeOnboarded():
const { count } = await supabase
  .from('store_members')
  .select('id', { count: 'exact' })
  .eq('user_id', userId)
  .eq('is_active', true);
return (count ?? 0) > 0;  // true = onboarded, false = not onboarded
```

**Critical:** Onboarding status depends on **store_members table**, not **stores** table
- A user must have at least one active store membership
- Created in `storesAPI.createStore()` when completing onboarding

---

## 15. ERROR HANDLING SUMMARY

### Sign In Errors
- "Invalid email or password" → Wrong credentials
- "Please verify your email" → Email not confirmed
- "No account found" → Profile missing from database

### Sign Up Errors
- "This email is already registered" → Duplicate email check
- "Password must be at least 8 characters" → Validation error
- "Invalid phone number" → Phone validation error

### Phone Verification Errors
- "OTP expired" → > 5 minutes old
- "Invalid OTP" → Wrong digits entered
- "OTP not found" → Never sent or cleared

### Onboarding Errors
- "Store name must be at least 2 characters" → Form validation
- "Invalid GSTIN format" → GSTIN regex validation
- "Failed to upload logo" → Storage error

### Session Errors
- "Session fingerprint mismatch" → Browser changed or hijacking
- "Session expired due to inactivity" → 15-minute timeout
- "Security validation failed" → Session security check failed

---

## 16. FLOW DECISION TREE

```
User Opens App
  │
  ├─> AuthProvider.init() runs
  │   │
  │   ├─> Session exists?
  │   │   ├─ NO → isAuthenticated = false
  │   │   │     └─> Route: AuthRoute allows /login, /signup
  │   │   │
  │   │   └─ YES → Check provider
  │   │       ├─> Google OAuth?
  │   │       │   ├─> Email already exists with different user?
  │   │       │   │   ├─ YES → LOGOUT & ERROR (duplicate)
  │   │       │   │   └─ NO → ensureProfile()
  │   │       │   │
  │   │       │   └─> probeOnboarded()
  │   │       │       └─> has store_members?
  │   │       │
  │   │       └─> Email provider?
  │   │           └─> Profile must exist (checked at login)
  │   │
  │   └─> SET_ONBOARDED(true/false)
  │
  └─> Router evaluates state
      │
      ├─> isLoading?
      │   └─> Show spinner
      │
      ├─> Navigate to /login, /signup, etc.?
      │   └─> Not authenticated → AuthRoute allows
      │
      ├─> Navigate to /dashboard, /catalog, etc.?
      │   └─> ProtectedRoute checks:
      │       ├─> Authenticated?
      │       │   └─> Not → go to /login
      │       └─> Onboarded?
      │           └─> Not → go to /get-started
      │
      └─> Navigate to /get-started, /onboarding?
          └─> OnboardingRoute checks:
              ├─> Authenticated?
              │   └─> Not → go to /login
              └─> Already onboarded?
                  └─> Yes → go to /dashboard
```


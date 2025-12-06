import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { storesAPI } from '../api/stores';
import { onboardingAPI } from '../api/onboardingProgress';
import toast from 'react-hot-toast';
import i18n from '../lib/i18n';
import type { User, Store } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_AUTH_SESSION_PRESENT'; payload: { uid: string; email: string | null } }
  | { type: 'SET_ONBOARDED'; payload: boolean }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isOnboarded: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTH_SESSION_PRESENT': {
      const provisionalUser: User = {
        uid: action.payload.uid,
        email: action.payload.email,
        name: null,
        isOnboarded: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      } as any;
      // We have a session but not the full profile/store data yet.
      // Keep loading true to prevent premature routing.
      return { ...state, user: provisionalUser, isAuthenticated: true, isLoading: true };
    }
    case 'SET_ONBOARDED':
      return {
        ...state,
        isOnboarded: action.payload,
        // Only stop loading if user is NOT onboarded (so they can see onboarding screen immediately).
        // If they ARE onboarded, we need to wait for SET_USER to load the store data
        // (which is required for the menu_setup_completed check in ProtectedRoute).
        isLoading: action.payload ? state.isLoading : false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isOnboarded: action.payload?.isOnboarded || false,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOnboarding: (storeData: Store) => Promise<void>;
  updateStoreSettings: (updates: Partial<Store>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);


// Fast membership probe for routing decisions
async function probeOnboarded(userId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('store_members')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// Probe onboarded status with timeout protection
async function probeOnboardedWithTimeout(userId: string, timeoutMs: number = 3000): Promise<boolean> {
  try {
    const probePromise = probeOnboarded(userId);
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    return await Promise.race([probePromise, timeoutPromise]);
  } catch (err) {
    console.error('[AuthContext] Onboarding probe failed:', err);
    return false;
  }
}

// Validate Google OAuth for duplicate accounts
async function validateGoogleOAuth(uid: string, email: string | null | undefined): Promise<{ isValid: boolean; errorMsg?: string }> {
  if (!email) return { isValid: true };

  try {
    // Check if profile with this email exists and belongs to a different user
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[AuthContext] Error checking existing profile:', error);
      return { isValid: true }; // Allow on error to not block auth
    }

    // If profile exists with different user ID, it's a duplicate account
    if (existingProfile && existingProfile.id !== uid) {
      return {
        isValid: false,
        errorMsg: 'This email is already registered with another account. Please sign in using email/password instead.'
      };
    }

    return { isValid: true };
  } catch (err) {
    console.error('[AuthContext] OAuth validation error:', err);
    return { isValid: true }; // Allow on validation error
  }
}

// Ensure OAuth profile exists
async function ensureOAuthProfile(session: any): Promise<boolean> {
  try {
    const uid = session.user.id;
    const email = session.user.email;
    const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
    const phone = session.user.user_metadata?.phone || '';

    // Validate for duplicates
    const validation = await validateGoogleOAuth(uid, email);
    if (!validation.isValid) {
      console.error('[AuthContext] OAuth validation failed:', validation.errorMsg);
      await authAPI.logout();
      toast.error(validation.errorMsg!);
      return false;
    }

    // Create or update profile
    const profile = await authAPI.ensureProfile(uid, email, name, phone);
    if (!profile) {
      console.error('[AuthContext] Failed to create/update profile');
      toast.error('Failed to create user profile. Please try again.');
      await authAPI.logout();
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AuthContext] Failed to ensure OAuth profile:', err);
    toast.error('Failed to setup account. Please try again.');
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const lastUserIdRef = useRef<string | null>(null);
  const lastProfileLoadAtRef = useRef<number>(0);

  const loadUserProfile = async (userId: string, email: string | null, opts?: { force?: boolean }) => {
    const now = Date.now();
    if (!opts?.force) {
      if (now - lastProfileLoadAtRef.current < 30_000 && lastUserIdRef.current === userId) {
        return;
      }
    }
    lastProfileLoadAtRef.current = now;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error loading profile:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      if (!profile) {
        // Profile doesn't exist - this shouldn't happen if signup worked properly
        console.error('[AuthContext] Profile not found for authenticated user:', userId);
        toast.error(i18n.t('auth.messages.profileNotFound'));
        await authAPI.logout();
        dispatch({ type: 'LOGOUT' });
        return;
      }

      // Load user stores
      const stores = await storesAPI.getUserStores();
      const userStore = stores && stores.length > 0 ? stores[0] : undefined;

      const user: User = {
        uid: profile.id,
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        photoURL: profile.photo_url,
        isOnboarded: !!userStore,
        store: userStore,
        createdAt: new Date(profile.created_at),
        lastLoginAt: new Date(profile.last_login_at),
      } as any;

      dispatch({ type: 'SET_USER', payload: user });
    } catch (err) {
      console.error('[AuthContext] Error in loadUserProfile:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    // Check if we're handling an OAuth or email confirmation callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const hasOAuthParams =
      hashParams.has('access_token') ||
      searchParams.has('code');
    const hasOAuthError = hashParams.has('error') || searchParams.has('error');
    const oAuthError = hashParams.get('error') || searchParams.get('error');
    const oAuthErrorDescription = hashParams.get('error_description') || searchParams.get('error_description');

    // Check if this is an email confirmation callback
    const isEmailConfirmation = window.location.pathname === '/auth/confirm';

    const init = async () => {
      try {
        // Check for OAuth errors first
        if (hasOAuthError) {
          console.error('[AuthContext] OAuth error detected:', oAuthError, oAuthErrorDescription);
          toast.error(`Authentication failed: ${oAuthErrorDescription || oAuthError || 'Unknown error'}`);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // If OAuth callback OR email confirmation callback, wait for session
        if (hasOAuthParams || isEmailConfirmation) {
          console.log(isEmailConfirmation ? '[AuthContext] Email confirmation callback detected' : '[AuthContext] OAuth callback detected');

          // Wait a bit for Supabase to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 1500));

          const { data: { session: callbackSession }, error: callbackError } = await supabase.auth.getSession();

          if (callbackError) {
            console.error('[AuthContext] Callback session error:', callbackError);
            toast.error('Failed to complete authentication. Please try again.');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          if (!callbackSession?.user) {
            console.error('[AuthContext] Callback - no session established');
            toast.error('Authentication failed. Please try again.');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          // Successfully got session from OAuth or email confirmation
          const uid = callbackSession.user.id;
          const email = callbackSession.user.email ?? null;
          const provider = callbackSession.user.app_metadata.provider;
          lastUserIdRef.current = uid;

          dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email } });

          // Handle Google OAuth - ensure profile exists
          if (provider === 'google') {
            const success = await ensureOAuthProfile(callbackSession);
            if (!success) {
              lastUserIdRef.current = null;
              dispatch({ type: 'LOGOUT' });
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
          }

          // Handle email confirmation - create profile if needed
          if (isEmailConfirmation && provider === 'email') {
            const name = callbackSession.user.user_metadata?.name || email?.split('@')[0] || 'User';
            const phone = callbackSession.user.user_metadata?.phone || '';
            const profile = await authAPI.ensureProfile(uid, email, name, phone);
            if (!profile) {
              console.error('[AuthContext] Failed to create profile after email confirmation');
              toast.error('Failed to create user profile. Please try again.');
              await authAPI.logout();
              lastUserIdRef.current = null;
              dispatch({ type: 'LOGOUT' });
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
            toast.success('Email verified successfully!');
          }

          // Check onboarding status
          const onboarded = await probeOnboardedWithTimeout(uid);
          dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

          // Load full profile
          loadUserProfile(uid, email, { force: true });
          return;
        }

        // Not OAuth callback - check for existing session (normal page load)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthContext] Error getting session:', sessionError);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        if (!session?.user) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const uid = session.user.id;
        const email = session.user.email ?? null;
        const provider = session.user.app_metadata.provider;
        lastUserIdRef.current = uid;

        dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email } });

        // Handle Google OAuth - ensure profile exists
        if (provider === 'google') {
          const success = await ensureOAuthProfile(session);
          if (!success) {
            lastUserIdRef.current = null;
            dispatch({ type: 'LOGOUT' });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        }

        // Check onboarding status
        const onboarded = await probeOnboardedWithTimeout(uid);
        dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

        // Load full profile in background
        loadUserProfile(uid, email, { force: true });
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;
      const provider = session?.user?.app_metadata?.provider;

      if (event === 'SIGNED_IN' && uid && session) {
        // Skip if we already handled this user in init()
        if (lastUserIdRef.current === uid) {
          return;
        }

        // Skip email/password users - login() handles them
        if (provider === 'email') {
          return;
        }

        console.log('[AuthContext] Unexpected OAuth sign-in event');
      }

      if (event === 'USER_UPDATED' && uid) {
        loadUserProfile(uid, email, { force: true });
      }

      if (event === 'SIGNED_OUT') {
        lastUserIdRef.current = null;
        lastProfileLoadAtRef.current = 0;
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      const { user } = await authAPI.loginWithEmail(email, password);

      if (!user) throw new Error('Login succeeded but user data not returned');

      lastUserIdRef.current = user.id;
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });

      // Probe onboarding status
      const onboarded = await probeOnboardedWithTimeout(user.id);
      dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

      toast.success(i18n.t('auth.messages.loginSuccess'));

      // Load profile in background
      loadUserProfile(user.id, user.email ?? null, { force: true });

      return true;
    } catch (error: any) {
      console.error('[AuthContext] Login error:', error);
      const errorMsg = error.message || i18n.t('auth.messages.loginFailed');
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await authAPI.loginWithGoogle();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Google login failed. Please try again.' });
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      const { user, session } = await authAPI.signUpWithEmail(email, password, name, phone || '');

      if (!user) throw new Error('Signup succeeded but user data not returned');

      // If session is null, email confirmation is required
      // User will need to verify email before they can login
      if (!session) {
        console.log('[AuthContext] Email confirmation required');
        return { user, session: null };
      }

      // Session exists - email confirmation disabled or auto-confirmed
      lastUserIdRef.current = user.id;
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });
      dispatch({ type: 'SET_ONBOARDED', payload: false });
      loadUserProfile(user.id, user.email ?? null, { force: true });
      toast.success(i18n.t('auth.messages.accountCreated'));

      return { user, session };
    } catch (error: any) {
      console.error('[AuthContext] Registration error:', error);
      const errorMessage = error.message || i18n.t('auth.messages.loginFailed');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error; // Re-throw so SignupScreen can handle it
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      lastUserIdRef.current = null;
      lastProfileLoadAtRef.current = 0;
      dispatch({ type: 'LOGOUT' });
      toast.success(i18n.t('auth.messages.logoutSuccess'));
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      dispatch({ type: 'SET_ERROR', payload: i18n.t('auth.messages.loginFailed') });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await authAPI.resetPassword(email);
      toast.success(i18n.t('auth.messages.passwordResetSent'));
    } catch (error: any) {
      console.error('[AuthContext] Reset password error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || i18n.t('auth.messages.loginFailed') });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');
      const created = await storesAPI.createStore(storeData);

      // Update profile onboarding_completed flag for data consistency
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', state.user.uid);

      // Clear onboarding progress
      await onboardingAPI.clear(state.user.uid);

      // Immediate local state update
      dispatch({ type: 'SET_ONBOARDED', payload: true });

      const nextUser = {
        ...state.user,
        isOnboarded: true,
        store: created,
      } as User;
      dispatch({ type: 'SET_USER', payload: nextUser });

      // Background refresh
      loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });

      toast.success(i18n.t('auth.messages.setupComplete'));
    } catch (error) {
      console.error('[AuthContext] Complete onboarding error:', error);
      dispatch({ type: 'SET_ERROR', payload: i18n.t('auth.messages.accountError') });
      throw new Error('onboarding_failed');
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>, options?: { showToast?: boolean }) => {
    try {
      if (!state.user || !state.user.store) throw new Error('No authenticated user or store');
      await storesAPI.updateStore((state.user.store as any).id, updates);
      await loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });
      if (options?.showToast) {
        toast.success(i18n.t('auth.messages.settingsUpdated'));
      }
    } catch (error) {
      console.error('[AuthContext] Update store settings error:', error);
      dispatch({ type: 'SET_ERROR', payload: i18n.t('auth.messages.accountError') });
    }
  };

  const refreshUserProfile = async () => {
    if (!state.user) return;
    await loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{ state, login, loginWithGoogle, register, logout, resetPassword, completeOnboarding, updateStoreSettings, refreshUserProfile, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
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
      return { ...state, user: provisionalUser, isAuthenticated: true };
    }
    case 'SET_ONBOARDED':
      return {
        ...state,
        isOnboarded: action.payload,
        isLoading: false,
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
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Check if user has active store membership (determines onboarded status)
 */
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

/**
 * Probe onboarded status with timeout protection
 */
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

/**
 * Handle Google OAuth flow - creates profile if first time, or validates existing user
 */
async function handleGoogleOAuth(session: any): Promise<{ success: boolean; isFirstTime: boolean }> {
  try {
    const uid = session.user.id;
    const email = session.user.email;

    if (!email) {
      console.error('[AuthContext] Google OAuth: No email provided');
      await authAPI.logout();
      toast.error('Unable to retrieve email from Google. Please try again.');
      return { success: false, isFirstTime: false };
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, auth_provider, email')
      .eq('id', uid)
      .maybeSingle();

    // First time Google user - create profile
    if (!existingProfile) {
      console.log('[AuthContext] Google OAuth: First time user, creating profile');
      
      // Check if email is used by a different user (different auth provider)
      const { data: emailConflict } = await supabase
        .from('profiles')
        .select('id, auth_provider')
        .eq('email', email.toLowerCase())
        .neq('id', uid)
        .maybeSingle();

      if (emailConflict) {
        console.error('[AuthContext] Email already registered with different provider');
        await authAPI.logout();
        const providerName = emailConflict.auth_provider === 'email' ? 'email/password' : 'another method';
        toast.error(`This email is already registered with ${providerName}. Please sign in using that method.`);
        return { success: false, isFirstTime: false };
      }

      // Create new profile for first-time Google user
      const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
      const phone = session.user.user_metadata?.phone || '';
      
      await authAPI.ensureProfile(uid, email, name, phone);
      console.log('[AuthContext] Google OAuth: Profile created successfully');
      
      return { success: true, isFirstTime: true };
    }

    // Returning user - just update last login
    console.log('[AuthContext] Google OAuth: Returning user');
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', uid);
    
    return { success: true, isFirstTime: false };
  } catch (err) {
    console.error('[AuthContext] Google OAuth handler error:', err);
    await authAPI.logout();
    toast.error('An error occurred during Google sign in. Please try again.');
    return { success: false, isFirstTime: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const lastUserIdRef = useRef<string | null>(null);
  const lastProfileLoadAtRef = useRef<number>(0);

  /**
   * Load complete user profile with store information
   */
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

  /**
   * Initialize auth state on mount and handle OAuth callbacks
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const uid = session.user.id;
        const email = session.user.email ?? null;
        const provider = session.user.app_metadata.provider;
        lastUserIdRef.current = uid;

        console.log('[AuthContext] Init: Session found', { uid, email, provider });
        dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email } });

        // Handle Google OAuth flow
        if (provider === 'google') {
          const { success, isFirstTime } = await handleGoogleOAuth(session);
          
          if (!success) {
            lastUserIdRef.current = null;
            dispatch({ type: 'LOGOUT' });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          if (isFirstTime) {
            // First time Google user - check for onboarding progress
            const hasProgress = await onboardingAPI.hasProgress(uid);
            if (hasProgress) {
              console.log('[AuthContext] Found existing onboarding progress, resuming');
            }
          }
        }

        // Check onboarding status
        const onboarded = await probeOnboardedWithTimeout(uid);
        dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

        // Load full profile
        await loadUserProfile(uid, email, { force: true });
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    init();

    // Listen for auth state changes (handles OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      const uid = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;

      if (event === 'SIGNED_IN' && uid && lastUserIdRef.current !== uid) {
        const provider = session!.user!.app_metadata.provider;
        console.log('[AuthContext] New sign in detected', { uid, email, provider });

        // Skip email/password - login() handles them
        if (provider === 'email') {
          console.log('[AuthContext] Email provider sign in, skipping (handled by login())');
          return;
        }

        lastUserIdRef.current = uid;
        dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email } });

        // Handle Google OAuth
        if (provider === 'google') {
          const { success, isFirstTime } = await handleGoogleOAuth(session!);
          
          if (!success) {
            lastUserIdRef.current = null;
            dispatch({ type: 'LOGOUT' });
            return;
          }

          if (isFirstTime) {
            toast.success('Welcome! Please complete your store setup.');
          } else {
            toast.success('Welcome back!');
          }
        }

        // Check onboarding and load profile
        const onboarded = await probeOnboardedWithTimeout(uid);
        dispatch({ type: 'SET_ONBOARDED', payload: onboarded });
        await loadUserProfile(uid, email, { force: true });
      }

      if (event === 'USER_UPDATED' && uid) {
        console.log('[AuthContext] User updated');
        await loadUserProfile(uid, email, { force: true });
      }

      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out');
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
      // Auth state change listener will handle the rest
    } catch (error: any) {
      console.error('[AuthContext] Google login error:', error);
      const errorMsg = error.message || 'Failed to login with Google. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      const { user } = await authAPI.signUpWithEmail(email, password, name, phone || '');
      if (!user) throw new Error('Signup succeeded but user data not returned');
      
      lastUserIdRef.current = user.id;
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });
      dispatch({ type: 'SET_ONBOARDED', payload: false });
      
      await loadUserProfile(user.id, user.email ?? null, { force: true });
      toast.success(i18n.t('auth.messages.accountCreated'));
    } catch (error: any) {
      console.error('[AuthContext] Registration error:', error);
      const errorMessage = error.message || i18n.t('auth.messages.loginFailed');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
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
      
      console.log('[AuthContext] Completing onboarding for user:', state.user.uid);
      const created = await storesAPI.createStore(storeData);

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
      await loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });

      toast.success(i18n.t('auth.messages.setupComplete'));
    } catch (error) {
      console.error('[AuthContext] Complete onboarding error:', error);
      dispatch({ type: 'SET_ERROR', payload: i18n.t('auth.messages.accountError') });
      throw new Error('onboarding_failed');
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>) => {
    try {
      if (!state.user || !state.user.store) throw new Error('No authenticated user or store');
      await storesAPI.updateStore((state.user.store as any).id, updates);
      await loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });
      toast.success(i18n.t('auth.messages.settingsUpdated'));
    } catch (error) {
      console.error('[AuthContext] Update store settings error:', error);
      dispatch({ type: 'SET_ERROR', payload: i18n.t('auth.messages.accountError') });
    }
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{ state, login, loginWithGoogle, register, logout, resetPassword, completeOnboarding, updateStoreSettings, clearError }}
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
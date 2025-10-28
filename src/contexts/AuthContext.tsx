import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { storesAPI } from '../api/stores';
import { onboardingAPI } from '../api/onboardingProgress';
import toast from 'react-hot-toast';
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

    const startsAt = Date.now();
    let attempt = 0;
    const maxMs = 10_000; // Reduced timeout to 10 seconds

    while (Date.now() - startsAt < maxMs) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profile) {
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
        return;
      }

      attempt++;
      const delay = Math.min(300 * 2 ** attempt, 3000);
      await new Promise((r) => setTimeout(r, delay));
    }

    // CRITICAL: If profile not found after retries, logout for security
    console.error('Profile not found for user:', userId, '- Logging out for security');
    toast.error('Your account profile was not found. Please sign up first.');

    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }

    dispatch({ type: 'LOGOUT' });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const uid = session.user.id;
        lastUserIdRef.current = uid;

        // Set provisional auth
        dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email: session.user.email ?? null } });

        // Ensure profile exists for OAuth users (Google, etc.)
        if (session.user.app_metadata.provider === 'google') {
          try {
            const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
            const phone = session.user.user_metadata?.phone || '';
            await authAPI.ensureProfile(uid, session.user.email, name, phone);
          } catch (err) {
            console.error('Failed to ensure OAuth profile:', err);
          }
        }

        // Fast membership probe for routing (with timeout protection)
        let onboarded = false;
        try {
          const probePromise = probeOnboarded(uid);
          const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
          onboarded = await Promise.race([probePromise, timeoutPromise]);
        } catch (err) {
          console.error('Onboarding probe failed:', err);
        }

        // CRITICAL: Always clear loading state to prevent infinite loader
        dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

        // Load full profile in background (non-blocking)
        loadUserProfile(uid, session.user.email ?? null, { force: true });
      } catch (err) {
        console.error('Init error:', err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    // Safety timeout: Force clear loading after 5 seconds to prevent infinite loader
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout: Forcing loading state to false');
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 5000);

    init().finally(() => {
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null;

      if (event === 'SIGNED_IN' && uid) {
        if (lastUserIdRef.current !== uid) {
          lastUserIdRef.current = uid;
          dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid, email: session!.user!.email ?? null } });

          // Ensure profile exists for OAuth users
          if (session!.user!.app_metadata.provider === 'google') {
            try {
              const name = session!.user!.user_metadata?.full_name || session!.user!.email?.split('@')[0];
              const phone = session!.user!.user_metadata?.phone || '';
              await authAPI.ensureProfile(uid, session!.user!.email, name, phone);
            } catch (err) {
              console.error('Failed to ensure OAuth profile on SIGNED_IN:', err);
            }
          }

          // Fast membership probe (with timeout protection)
          let onboarded = false;
          try {
            const probePromise = probeOnboarded(uid);
            const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
            onboarded = await Promise.race([probePromise, timeoutPromise]);
          } catch (err) {
            console.error('Onboarding probe failed on SIGNED_IN:', err);
          }

          dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

          loadUserProfile(uid, session!.user!.email ?? null, { force: true });
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (event === 'USER_UPDATED' && uid) {
        loadUserProfile(uid, session!.user!.email ?? null, { force: true });
        return;
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

      // Fast membership probe with timeout
      let onboarded = false;
      try {
        const probePromise = probeOnboarded(user.id);
        const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
        onboarded = await Promise.race([probePromise, timeoutPromise]);
      } catch (err) {
        console.error('Onboarding probe failed during login:', err);
      }

      dispatch({ type: 'SET_ONBOARDED', payload: onboarded });

      // Simple success toast (no API calls, no complexity)
      toast.success('Login successful!');

      // Load profile in background without blocking
      loadUserProfile(user.id, user.email ?? null, { force: true });

      return true;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Login failed. Please try again.' });
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
      const { user } = await authAPI.signUpWithEmail(email, password, name, phone || '');
      if (!user) throw new Error('Signup succeeded but user data not returned');
      lastUserIdRef.current = user.id;
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });
      dispatch({ type: 'SET_ONBOARDED', payload: false });
      loadUserProfile(user.id, user.email ?? null, { force: true });
      toast.success('Account created successfully! Welcome!');
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed. Please try again.';
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
      toast.success('Logged out successfully');
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Logout failed. Please try again.' });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await authAPI.resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to send reset email. Please try again.' });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');
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
      loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });

      toast.success('Store setup completed!');
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to complete setup. Please try again.' });
      throw new Error('onboarding_failed');
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>) => {
    try {
      if (!state.user || !state.user.store) throw new Error('No authenticated user or store');
      await storesAPI.updateStore((state.user.store as any).id, updates);
      await loadUserProfile(state.user.uid, state.user.email ?? null, { force: true });
      toast.success('Settings updated successfully!');
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update settings. Please try again.' });
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
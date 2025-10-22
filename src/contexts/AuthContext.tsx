import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { storesAPI } from '../api/stores';
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
      // Provisional auth: session exists, allow routing while profile loads
      const provisionalUser: User = {
        uid: action.payload.uid,
        email: action.payload.email,
        name: null,
        isOnboarded: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      } as any;
      return { ...state, user: provisionalUser, isAuthenticated: true, isLoading: true };
    }
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

async function upsertMinimalProfile(userId: string, email: string | null) {
  // Create a minimal profile if missing to avoid first-login race conditions
  const name = email ? email.split('@')[0] : 'user';
  await supabase.from('profiles').upsert(
    { id: userId, email, name, phone: '', last_login_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const loadUserProfile = async (userId: string, email: string | null) => {
    // Exponential backoff up to ~40s; create if still missing
    const startsAt = Date.now();
    let attempt = 0;
    const maxMs = 40000;

    while (Date.now() - startsAt < maxMs) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] profile query error', error);
        // Short sleep and retry
      } else if (profile) {
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

      // After a few attempts, upsert a minimal profile to break the deadlock
      attempt++;
      if (attempt === 5) {
        try {
          await upsertMinimalProfile(userId, email);
        } catch (e) {
          console.warn('[Auth] upsert minimal profile failed or not needed', e);
        }
      }
      // backoff: 300ms, 600ms, 1200ms, ... capping at 3000ms
      const delay = Math.min(300 * 2 ** attempt, 3000);
      await new Promise((r) => setTimeout(r, delay));
    }

    // As a last resort, set a minimal user so routing can continue
    const minimal: User = {
      uid: userId,
      email,
      name: email ? email.split('@')[0] : null,
      isOnboarded: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    } as any;
    dispatch({ type: 'SET_USER', payload: minimal });
    toast.error('Profile is taking longer than usual to load. Some features may be limited.');
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Provisional auth immediately
          dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: session.user.id, email: session.user.email ?? null } });
          // Load profile asynchronously
          loadUserProfile(session.user.id, session.user.email ?? null);
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (e) {
        console.error('[Auth] init error', e);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: session.user.id, email: session.user.email ?? null } });
        loadUserProfile(session.user.id, session.user.email ?? null);
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      } else if (event === 'USER_UPDATED' && session?.user) {
        loadUserProfile(session.user.id, session.user.email ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      const { user } = await authAPI.loginWithEmail(email, password);
      if (!user) throw new Error('Login succeeded but user data not returned');
      // Provisional auth then profile load
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });
      loadUserProfile(user.id, user.email ?? null);
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Login failed. Please try again.' });
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await authAPI.loginWithGoogle();
      // Redirect handled by Supabase; onAuthStateChange covers the rest
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Google login failed. Please try again.' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      const { user } = await authAPI.signUpWithEmail(email, password, name, phone);
      if (!user) throw new Error('Signup succeeded but user data not returned');
      // Provisional auth then profile load
      dispatch({ type: 'SET_AUTH_SESSION_PRESENT', payload: { uid: user.id, email: user.email ?? null } });
      loadUserProfile(user.id, user.email ?? null);
      toast.success('Account created successfully! Welcome!');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Registration failed. Please try again.' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Logout failed. Please try again.' });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await authAPI.resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to send reset email. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');
      dispatch({ type: 'SET_LOADING', payload: true });
      await storesAPI.createStore(storeData);
      await loadUserProfile(state.user.uid, state.user.email ?? null);
      toast.success('Store setup completed!');
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to complete setup. Please try again.' });
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>) => {
    try {
      if (!state.user || !state.user.store) throw new Error('No authenticated user or store');
      await storesAPI.updateStore((state.user.store as any).id, updates);
      await loadUserProfile(state.user.uid, state.user.email ?? null);
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

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
      console.log('[AuthReducer] SET_LOADING:', action.payload);
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      console.log('[AuthReducer] SET_USER:', {
        user: action.payload?.email,
        isAuthenticated: action.payload !== null,
        isOnboarded: action.payload?.isOnboarded || false
      });
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isOnboarded: action.payload?.isOnboarded || false,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      console.log('[AuthReducer] SET_ERROR:', action.payload);
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      console.log('[AuthReducer] LOGOUT');
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const loadUserProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log('[loadUserProfile] Loading profile for user:', userId, 'retry:', retryCount);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[loadUserProfile] Profile query error:', profileError);
        throw profileError;
      }

      if (!profile && retryCount < 3) {
        console.log('[loadUserProfile] Profile not found, retrying...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return loadUserProfile(userId, retryCount + 1);
      }

      if (!profile) {
        console.error('[loadUserProfile] Profile not found after 3 retries');
        throw new Error('Profile not found after multiple attempts');
      }

      console.log('[loadUserProfile] Profile loaded:', profile.email);

      const stores = await storesAPI.getUserStores();
      const userStore = stores && stores.length > 0 ? stores[0] : undefined;

      console.log('[loadUserProfile] Store:', userStore ? userStore.name : 'No store (needs onboarding)');

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
      };

      console.log('[loadUserProfile] Setting user, isOnboarded:', !!userStore);
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error: any) {
      console.error('[loadUserProfile] Error loading profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user profile' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadUserProfile(session.user.id);
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();

    const loadingTimeout = setTimeout(() => {
      if (state.isLoading) {
        console.warn('Auth loading timeout - forcing loading state to false');
        dispatch({ type: 'SET_LOADING', payload: false });
        toast.error('Authentication took too long. Please refresh the page.');
      }
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, loading profile...');
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        dispatch({ type: 'LOGOUT' });
      } else if (event === 'USER_UPDATED' && session) {
        console.log('User updated, reloading profile...');
        await loadUserProfile(session.user.id);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed');
        // Token refresh is automatic, no need to reload profile
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery initiated');
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('[login] Starting login for:', email);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const { user } = await authAPI.loginWithEmail(email, password);
      console.log('[login] Login API response, user:', user?.email);

      if (!user) {
        throw new Error('Login succeeded but user data not returned');
      }

      console.log('[login] Loading user profile...');
      await loadUserProfile(user.id);

      console.log('[login] Login complete!');
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('[login] Login error:', error);
      const errorMessage = error.message || 'Login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      await authAPI.loginWithGoogle();
      // Note: Google OAuth will redirect, so profile loading happens via onAuthStateChange
    } catch (error: any) {
      const errorMessage = error.message || 'Google login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      console.log('[register] Starting registration for:', email);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      if (!phone) {
        throw new Error('Phone number is required');
      }

      const { user } = await authAPI.signUpWithEmail(email, password, name, phone);
      console.log('[register] Signup API response, user:', user?.email);

      if (!user) {
        throw new Error('Signup succeeded but user data not returned');
      }

      console.log('[register] Loading user profile...');
      await loadUserProfile(user.id);

      console.log('[register] Registration complete!');
      toast.success('Account created successfully! Welcome!');
    } catch (error: any) {
      console.error('[register] Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    } catch (error: any) {
      const errorMessage = 'Logout failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      await authAPI.resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');

      dispatch({ type: 'SET_LOADING', payload: true });

      await storesAPI.createStore(storeData);

      await loadUserProfile(state.user.uid);

      toast.success('Store setup completed!');
    } catch (error: any) {
      const errorMessage = 'Failed to complete setup. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>) => {
    try {
      if (!state.user || !state.user.store) {
        throw new Error('No authenticated user or store');
      }

      await storesAPI.updateStore(state.user.store.id, updates);

      await loadUserProfile(state.user.uid);

      toast.success('Settings updated successfully!');
    } catch (error: any) {
      const errorMessage = 'Failed to update settings. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        loginWithGoogle,
        register,
        logout,
        resetPassword,
        completeOnboarding,
        updateStoreSettings,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

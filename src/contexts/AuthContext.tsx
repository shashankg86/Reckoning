import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';
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
      return { ...state, isLoading: action.payload };
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOnboarding: (storeData: Store) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (firebaseUser) {
        try {
          // User is signed in, fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update last login
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLoginAt: new Date()
            });

            const user: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || firebaseUser.displayName,
              phone: userData.phone,
              photoURL: firebaseUser.photoURL,
              isOnboarded: userData.isOnboarded || false,
              store: userData.store,
              createdAt: userData.createdAt?.toDate() || new Date(),
              lastLoginAt: new Date()
            };

            dispatch({ type: 'SET_USER', payload: user });
          } else {
            // New user, create document
            const newUser: Partial<User> = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isOnboarded: false,
              createdAt: new Date(),
              lastLoginAt: new Date()
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            
            dispatch({ type: 'SET_USER', payload: newUser as User });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
        }
      } else {
        // User is signed out
        dispatch({ type: 'SET_USER', payload: null });
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, { displayName: name });

      // Create user document in Firestore
      const userData: Partial<User> = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name,
        phone: phone,
        isOnboarded: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      dispatch({ type: 'LOGOUT' });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updates = {
        store: storeData,
        isOnboarded: true
      };

      await updateDoc(doc(db, 'users', state.user.uid), updates);
      
      // Update local state
      const updatedUser: User = {
        ...state.user,
        ...updates
      };
      
      dispatch({ type: 'SET_USER', payload: updatedUser });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
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
        register,
        logout,
        resetPassword,
        completeOnboarding,
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
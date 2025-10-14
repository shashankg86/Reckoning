import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './ui/Loader';

// Auth screens
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { PhoneVerificationScreen } from '../screens/PhoneVerificationScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// App screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { OCRImportScreen } from '../screens/OCRImportScreen';
import { ReportsScreen } from '../screens/ReportsScreen';

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<AuthRoute><LoginScreen /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignupScreen /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordScreen /></AuthRoute>} />
        
        {/* Phone verification route */}
        <Route path="/phone-verification" element={<VerificationRoute><PhoneVerificationScreen /></VerificationRoute>} />
        
        {/* Onboarding route */}
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingScreen /></OnboardingRoute>} />
        
        {/* Protected app routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute><CatalogScreen /></ProtectedRoute>} />
        <Route path="/invoice" element={<ProtectedRoute><InvoiceScreen /></ProtectedRoute>} />
        <Route path="/ocr" element={<ProtectedRoute><OCRImportScreen /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Separate route guard components
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!state.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  console.log('[AuthRoute] state:', {
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isOnboarded: state.isOnboarded
  });

  if (state.isLoading) {
    console.log('[AuthRoute] Still loading, showing loader');
    return <LoadingScreen />;
  }

  if (state.isAuthenticated) {
    if (!state.isOnboarded) {
      console.log('[AuthRoute] Authenticated but not onboarded, redirecting to /onboarding');
      return <Navigate to="/onboarding" replace />;
    }
    console.log('[AuthRoute] Authenticated and onboarded, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[AuthRoute] Not authenticated, showing auth screen');
  return <>{children}</>;
}

function VerificationRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  console.log('[VerificationRoute] state:', {
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    pendingVerification: state.pendingVerification
  });

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  // If already authenticated and onboarded, redirect to dashboard
  if (state.isAuthenticated && state.isOnboarded) {
    console.log('[VerificationRoute] Already authenticated and onboarded, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Allow access to verification screen
  // The screen itself will handle validation of required data
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
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
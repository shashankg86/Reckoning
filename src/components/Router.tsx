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
        <Route path="/get-started" element={<OnboardingRoute><OnboardingScreen /></OnboardingRoute>} />
        
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

function AuthRoute({ children }: { children: React.ReactNode }) {
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

function VerificationRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  if (state.isAuthenticated && state.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

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
  
  // Redirect to dashboard if already onboarded
  if (state.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
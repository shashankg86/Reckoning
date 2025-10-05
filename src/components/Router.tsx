import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WelcomeScreen } from './WelcomeScreen';

// Auth screens
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// App screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { OCRImportScreen } from '../screens/OCRImportScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { LoadingScreen } from './ui/Loader';
import { useState } from 'react';

// Protected route wrapper
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
  
  // Show welcome screen for first-time users after onboarding
  const [showWelcome, setShowWelcome] = useState(true);
  if (showWelcome && state.user?.isOnboarded) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }
  
  return <>{children}</>;
}

// Auth route wrapper
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return <LoadingScreen />;
  }
  
  if (state.isAuthenticated) {
    if (!state.isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Onboarding route wrapper
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

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={
          <AuthRoute>
            <LoginScreen />
          </AuthRoute>
        } />
        <Route path="/signup" element={
          <AuthRoute>
            <SignupScreen />
          </AuthRoute>
        } />
        <Route path="/forgot-password" element={
          <AuthRoute>
            <ForgotPasswordScreen />
          </AuthRoute>
        } />
        
        {/* Onboarding route */}
        <Route path="/onboarding" element={
          <OnboardingRoute>
            <OnboardingScreen />
          </OnboardingRoute>
        } />
        
        {/* Protected app routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        } />
        <Route path="/catalog" element={
          <ProtectedRoute>
            <CatalogScreen />
          </ProtectedRoute>
        } />
        <Route path="/invoice" element={
          <ProtectedRoute>
            <InvoiceScreen />
          </ProtectedRoute>
        } />
        <Route path="/ocr" element={
          <ProtectedRoute>
            <OCRImportScreen />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsScreen />
          </ProtectedRoute>
        } />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
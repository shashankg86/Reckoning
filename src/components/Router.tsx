import React from 'react';
import { usePOS } from '../context/POSContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { OCRImportScreen } from '../screens/OCRImportScreen';
import { ReportsScreen } from '../screens/ReportsScreen';

export function Router() {
  const { state } = usePOS();

  if (!state.isAuthenticated) {
    switch (state.currentScreen) {
      case 'signup':
        return <SignupScreen />;
      case 'forgot-password':
        return <ForgotPasswordScreen />;
      default:
        return <LoginScreen />;
    }
  }

  if (!state.isOnboarded) {
    return <OnboardingScreen />;
  }

  switch (state.currentScreen) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'catalog':
      return <CatalogScreen />;
    case 'invoice':
      return <InvoiceScreen />;
    case 'ocr':
      return <OCRImportScreen />;
    case 'reports':
      return <ReportsScreen />;
    default:
      return <DashboardScreen />;
  }
}
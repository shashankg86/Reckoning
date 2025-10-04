import { usePOS } from '../context/POSContext';
import { CatalogScreen } from '../screens/CatalogScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OCRImportScreen } from '../screens/OCRImportScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SignupScreen } from '../screens/SignupScreen';

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
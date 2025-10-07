import { POSProvider } from './contexts/POSContext';
import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';
import './lib/i18n';

function App() {
  return (
    <AuthProvider>
      <POSProvider>
        <Router />
      </POSProvider>
    </AuthProvider>
  );
}

export default App;
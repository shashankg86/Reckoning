import { Router } from './components/Router';
import { AuthProvider } from './contexts/AuthContext';
import { POSProvider } from './context/POSContext';
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
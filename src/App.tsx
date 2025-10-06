import { Router } from './components/Router';
import { AuthProvider } from './contexts/AuthContext';
import './lib/i18n';

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
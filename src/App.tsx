import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { POSProvider } from './contexts/POSContext';
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
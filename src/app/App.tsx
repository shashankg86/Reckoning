import React from 'react';
import { POSProvider } from '../context/POSContext';
import { Router } from '../components/Router';
import '../lib/i18n';

function App() {
  return (
    <POSProvider>
      <Router />
    </POSProvider>
  );
}

export default App;
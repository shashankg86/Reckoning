import React from 'react';
import { POSProvider } from './context/POSContext';
import { Router } from './components/Router';

function App() {
  return (
    <POSProvider>
      <Router />
    </POSProvider>
  );
}

export default App;
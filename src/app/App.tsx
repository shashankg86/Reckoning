import { Router } from '../components/Router';
import { POSProvider } from '../context/POSContext';
import '../lib/i18n';

function App() {
  return (
    <POSProvider>
      <Router />
    </POSProvider>
  );
}

export default App;
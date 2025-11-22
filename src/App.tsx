import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from './components/Router';
import { AuthProvider } from './contexts/AuthContext';
import { POSProvider } from './contexts/POSContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * Setup security headers and protections
 */
function setupSecurityHeaders() {
  // Prevent iframe embedding (clickjacking protection)
  if (window.self !== window.top && window.top) {
    window.top.location.href = window.self.location.href;
  }

  // Prevent right-click in production (optional - for POS kiosk mode)
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Disable specific keyboard shortcuts in production
    document.addEventListener('keydown', (e) => {
      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Prevent Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      // Prevent Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
      }
      // Prevent Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    });
  }

  // Clear console in production
  if (import.meta.env.PROD) {
    // Override console methods
    const noop = () => { };
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    console.info = noop;
  }
}

/**
 * Handle visibility change (pause/resume app when tab is hidden)
 */
function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[App] Page hidden - user switched tab');
      // Session manager automatically handles pausing activity tracking
    } else {
      console.log('[App] Page visible - user returned to tab');
      // Session manager automatically resumes activity tracking
    }
  });
}

/**
 * Handle network status changes
 */
function setupNetworkMonitoring() {
  window.addEventListener('online', () => {
    console.log('[App] Network connection restored');
    // You could show a toast notification here
  });

  window.addEventListener('offline', () => {
    console.log('[App] Network connection lost');
    // You could show a toast notification here
  });
}

/**
 * Detect browser memory warnings
 */
function setupMemoryMonitoring() {
  if ('memory' in performance && (performance as any).memory) {
    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usedMemoryPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (usedMemoryPercentage > 90) {
        console.warn('[App] High memory usage detected:', usedMemoryPercentage.toFixed(2) + '%');
        // You could trigger cleanup or show warning
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
  }
}

/**
 * Handle before unload (prevent accidental tab closure during transactions)
 */
function setupUnloadHandler() {
  window.addEventListener('beforeunload', (e) => {
    // Check if there are unsaved changes in cart
    const hasUnsavedData = sessionStorage.getItem('has-unsaved-cart');

    if (hasUnsavedData === 'true') {
      e.preventDefault();
      e.returnValue = ''; // Standard way to show confirmation dialog
    }
  });
}

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  useEffect(() => {
    console.log('[App] Initializing application...');

    // Setup all security measures
    setupSecurityHeaders();
    setupVisibilityHandler();
    setupNetworkMonitoring();
    setupMemoryMonitoring();
    setupUnloadHandler();

    console.log('[App] Security features initialized');

    // Cleanup function
    return () => {
      console.log('[App] Cleaning up application...');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <POSProvider>
          <ThemeProvider>
            <Router />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontSize: '14px',
                  padding: '12px 20px',
                  borderRadius: '8px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ThemeProvider>
        </POSProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
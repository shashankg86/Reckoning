import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../components/ui/Loader';
import toast from 'react-hot-toast';

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Supabase automatically handles PKCE code exchange via detectSessionInUrl config.
     *
     * Flow:
     * 1. Supabase exchanges code automatically
     * 2. onAuthStateChange fires SIGNED_IN in AuthContext
     * 3. AuthContext creates profile
     * 4. CallbackRoute (Router) detects isAuthenticated
     * 5. CallbackRoute redirects to /get-started
     *
     * We just check for errors and show loading.
     */
    console.log('[AuthCallback] Processing email verification callback...');

    // Check for errors in URL params
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      console.error('[AuthCallback] Error in URL:', errorParam, errorDescription);
      setError(errorDescription || 'Authentication failed');
      toast.error(errorDescription || 'Authentication failed');

      // Redirect to login after delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.verificationFailed')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {error}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-4">
            {t('auth.redirectingToLogin')}
          </p>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}

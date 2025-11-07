import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { LoadingScreen } from '../components/ui/Loader';
import toast from 'react-hot-toast';

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Supabase automatically handles the PKCE code exchange via detectSessionInUrl config.
     * We just need to:
     * 1. Check for errors in URL params
     * 2. Wait for onAuthStateChange to fire with SIGNED_IN event
     * 3. AuthContext will handle profile creation and navigation
     */
    const handleAuthCallback = () => {
      console.log('[AuthCallback] Callback page loaded, waiting for Supabase to handle code exchange...');

      // Check for errors in URL
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
        return;
      }

      // Set up auth state listener to detect when verification completes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthCallback] Auth event:', event, 'Email confirmed:', session?.user?.email_confirmed_at);

        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          console.log('[AuthCallback] Email verified! AuthContext will handle profile & navigation.');
          toast.success('Email verified successfully!');

          // AuthContext's onAuthStateChange will:
          // 1. Create the profile
          // 2. Set authenticated & onboarded state
          // 3. Router will automatically redirect to /get-started or /dashboard

          // Navigate to root - Router will redirect based on auth state
          setTimeout(() => {
            navigate('/', { replace: true });
            subscription.unsubscribe();
          }, 500);
        }

        if (event === 'SIGNED_IN' && !session?.user?.email_confirmed_at) {
          console.error('[AuthCallback] User signed in but email not confirmed');
          setError('Email not verified');
          toast.error('Email verification failed');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          subscription.unsubscribe();
        }
      });

      // Cleanup listener on unmount
      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = handleAuthCallback();
    return cleanup;
  }, [searchParams, navigate, t]);

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

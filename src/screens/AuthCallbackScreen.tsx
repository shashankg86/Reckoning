import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';
import { LoadingScreen } from '../components/ui/Loader';

type VerificationStatus = 'verifying' | 'success' | 'error';

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const error = queryParams.get('error');
        const errorCode = queryParams.get('error_code');

        console.log('[AuthCallback] Starting, params:', { hasCode: !!code, error, errorCode });

        // Handle OAuth errors
        if (error) {
          if (errorCode === 'otp_expired') {
            throw new Error('Verification link has expired. Please request a new one.');
          }
          throw new Error(queryParams.get('error_description') || error || 'Authentication failed');
        }

        let session = null;

        // PKCE code exchange
        if (code) {
          // CRITICAL: Check if this code was already exchanged
          const processedKey = `pkce_code_${code}`;
          const alreadyProcessed = sessionStorage.getItem(processedKey);

          if (alreadyProcessed) {
            console.log('[AuthCallback] Code already exchanged, fetching existing session');
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
              session = existingSession;
            } else {
              throw new Error('Code was already used but no session found. Please sign up again.');
            }
          } else {
            // Mark as processing BEFORE the exchange to prevent duplicate calls
            sessionStorage.setItem(processedKey, 'true');

            console.log('[AuthCallback] Exchanging PKCE code for session');
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              // Clear the flag if exchange failed so user can retry
              sessionStorage.removeItem(processedKey);
              console.error('[AuthCallback] Code exchange failed:', exchangeError);
              throw new Error(`Authentication failed: ${exchangeError.message}`);
            }

            if (!data?.session) {
              sessionStorage.removeItem(processedKey);
              throw new Error('Code exchange succeeded but no session returned');
            }

            session = data.session;
            console.log('[AuthCallback] Code exchange successful');
          }
        } else {
          // Fallback: check existing session (implicit flow or other scenarios)
          console.log('[AuthCallback] No code, checking existing session');
          const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !existingSession) {
            throw new Error('No authentication code found and no active session');
          }

          session = existingSession;
          console.log('[AuthCallback] Using existing session');
        }

        if (!isMounted) return;

        // Handle successful authentication
        await handleSuccessfulAuth(session);

      } catch (error: any) {
        if (!isMounted) return;

        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Authentication failed');
        toast.error(error.message || 'Authentication failed');

        setTimeout(() => {
          if (isMounted) {
            navigate('/signup', { replace: true });
          }
        }, 3000);
      }
    };

    const handleSuccessfulAuth = async (session: any) => {
      const user = session.user;

      console.log('[AuthCallback] User authenticated:', {
        id: user.id,
        email: user.email,
        emailConfirmed: !!user.email_confirmed_at
      });

      // Verify email
      if (!user.email_confirmed_at) {
        throw new Error('Email not verified. Please check your email and verify your account.');
      }

      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const phone = user.user_metadata?.phone || '';

      console.log('[AuthCallback] Creating/ensuring profile');
      await authAPI.ensureProfile(user.id, user.email, name, phone);
      console.log('[AuthCallback] Profile ready');

      if (!isMounted) return;

      setStatus('success');
      toast.success('Email verified! Redirecting to onboarding...');

      setTimeout(() => {
        if (isMounted) {
          navigate('/onboarding', { replace: true });
        }
      }, 1500);
    };

    handleAuthCallback();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - run once on mount to handle auth callback

  if (status === 'verifying') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <img src={BRAND.LOGO_URL} alt={BRAND.NAME} className="w-10 h-10 object-contain" />
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                  <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.emailVerified')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {t('auth.verificationSuccess')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Redirecting to onboarding...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-3 mb-4">
                  <ExclamationCircleIcon className="h-16 w-16 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.verificationFailed')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {errorMessage || t('auth.verificationError')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Redirecting to signup...
                </p>
                <button
                  onClick={() => navigate('/signup', { replace: true })}
                  className="mt-4 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                >
                  Go to Signup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

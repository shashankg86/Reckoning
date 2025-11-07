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
    // Parse URL params SYNCHRONOUSLY first
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    const error = queryParams.get('error');

    // CRITICAL: Check and set flags SYNCHRONOUSLY before any async operations
    if (code) {
      const processedKey = `pkce_code_${code}_completed`;
      const processingKey = `pkce_code_${code}_processing`;

      // Check if already fully completed
      const alreadyCompleted = sessionStorage.getItem(processedKey);
      if (alreadyCompleted) {
        console.log('[AuthCallback] Code already completed, skipping');
        return;
      }

      // Check if currently being processed by another effect
      const currentlyProcessing = sessionStorage.getItem(processingKey);
      if (currentlyProcessing) {
        console.log('[AuthCallback] Code currently being processed by another effect, skipping');
        return;
      }

      // Mark as currently processing
      sessionStorage.setItem(processingKey, 'true');
      sessionStorage.setItem('email_verification_in_progress', 'true');
      console.log('[AuthCallback] Starting to process code');
    }

    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Starting async flow');

        // Handle OAuth errors
        if (error) {
          const errorCode = queryParams.get('error_code');
          if (errorCode === 'otp_expired') {
            throw new Error('Verification link has expired. Please request a new one.');
          }
          throw new Error(queryParams.get('error_description') || error || 'Authentication failed');
        }

        let session = null;

        // PKCE code exchange
        if (code) {
          // Check if we already have a session (component remounted after exchange)
          console.log('[AuthCallback] Checking if session already exists from previous exchange...');
          const { data: { session: existingSession } } = await supabase.auth.getSession();

          if (existingSession) {
            console.log('[AuthCallback] Session already exists (remount after exchange), using it');
            session = existingSession;
          } else {
            console.log('[AuthCallback] ===== STARTING PKCE CODE EXCHANGE =====');
            console.log('[AuthCallback] Calling supabase.auth.exchangeCodeForSession...');

            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            console.log('[AuthCallback] ===== PKCE CODE EXCHANGE COMPLETED =====');
            console.log('[AuthCallback] Exchange result:', {
              hasData: !!data,
              hasSession: !!data?.session,
              hasError: !!exchangeError,
              userId: data?.session?.user?.id
            });

            if (exchangeError) {
              // Clear processing flags if exchange failed so user can retry
              sessionStorage.removeItem(`pkce_code_${code}_processing`);
              sessionStorage.removeItem('email_verification_in_progress');
              console.error('[AuthCallback] Code exchange failed:', exchangeError);
              throw new Error(`Authentication failed: ${exchangeError.message}`);
            }

            if (!data?.session) {
              sessionStorage.removeItem(`pkce_code_${code}_processing`);
              sessionStorage.removeItem('email_verification_in_progress');
              throw new Error('Code exchange succeeded but no session returned');
            }

            session = data.session;
            console.log('[AuthCallback] ===== CODE EXCHANGE SUCCESS - CONTINUING TO HANDLE AUTH =====');
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

        console.log('[AuthCallback] ===== CHECKING IF COMPONENT STILL MOUNTED =====');
        if (!isMounted) {
          console.error('[AuthCallback] Component unmounted! Stopping execution.');
          return;
        }
        console.log('[AuthCallback] Component still mounted, proceeding...');

        // Handle successful authentication
        console.log('[AuthCallback] ===== CALLING handleSuccessfulAuth =====');
        await handleSuccessfulAuth(session);
        console.log('[AuthCallback] ===== handleSuccessfulAuth COMPLETED =====');

      } catch (error: any) {
        if (!isMounted) return;

        console.error('[AuthCallback] Error:', error);

        // Clear processing flags on error to allow retry (but don't mark as completed)
        if (code) {
          sessionStorage.removeItem(`pkce_code_${code}_processing`);
        }
        sessionStorage.removeItem('email_verification_in_progress');
        console.log('[AuthCallback] Cleared processing flags after error (can retry)');

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
      console.log('[AuthCallback.handleSuccessfulAuth] ===== STARTING =====');
      const user = session.user;

      console.log('[AuthCallback.handleSuccessfulAuth] User authenticated:', {
        id: user.id,
        email: user.email,
        emailConfirmed: !!user.email_confirmed_at
      });

      // Verify email
      if (!user.email_confirmed_at) {
        console.error('[AuthCallback.handleSuccessfulAuth] Email not confirmed!');
        throw new Error('Email not verified. Please check your email and verify your account.');
      }
      console.log('[AuthCallback.handleSuccessfulAuth] Email confirmed ✓');

      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const phone = user.user_metadata?.phone || '';

      console.log('[AuthCallback.handleSuccessfulAuth] ===== CALLING ensureProfile =====');
      console.log('[AuthCallback.handleSuccessfulAuth] Profile data:', { userId: user.id, email: user.email, name, phone });

      await authAPI.ensureProfile(user.id, user.email, name, phone);

      console.log('[AuthCallback.handleSuccessfulAuth] ===== ensureProfile COMPLETED =====');
      console.log('[AuthCallback.handleSuccessfulAuth] Profile created successfully ✓');

      // Mark as completed and clear processing flags
      if (code) {
        sessionStorage.setItem(`pkce_code_${code}_completed`, 'true');
        sessionStorage.removeItem(`pkce_code_${code}_processing`);
      }
      sessionStorage.removeItem('email_verification_in_progress');
      console.log('[AuthCallback.handleSuccessfulAuth] Marked as completed, cleared all flags ✓');

      if (!isMounted) {
        console.error('[AuthCallback.handleSuccessfulAuth] Component unmounted before setting success state!');
        return;
      }

      console.log('[AuthCallback.handleSuccessfulAuth] Setting status to success...');
      setStatus('success');
      toast.success('Email verified! Redirecting to onboarding...');

      console.log('[AuthCallback.handleSuccessfulAuth] Scheduling navigation to /onboarding...');
      setTimeout(() => {
        if (isMounted) {
          console.log('[AuthCallback.handleSuccessfulAuth] Navigating to /onboarding');
          navigate('/onboarding', { replace: true });
        } else {
          console.error('[AuthCallback.handleSuccessfulAuth] Component unmounted before navigation!');
        }
      }, 1500);

      console.log('[AuthCallback.handleSuccessfulAuth] ===== COMPLETED =====');
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

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

// Module-level abort signal for concurrent safety
let abortController: AbortController | null = null;

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    const error = queryParams.get('error');
    const completedKey = code ? `pkce_code_${code}_completed` : null;
    const processingKey = code ? `pkce_code_${code}_processing` : null;

    if (code) {
      if (sessionStorage.getItem(completedKey!)) return;
      if (sessionStorage.getItem(processingKey!)) return;
      sessionStorage.setItem(processingKey!, 'true');
      sessionStorage.setItem('email_verification_in_progress', 'true');
    }

    let isMounted = true;

    const safeSetState = <T extends (...args: any[]) => void>(fn: T) =>
      (...args: Parameters<T>) => {
        if (!isMounted || signal.aborted) return;
        fn(...args);
      };

    const handleAuthCallback = async () => {
      try {
        if (error) {
          const errorCode = queryParams.get('error_code');
          if (errorCode === 'otp_expired') throw new Error('Verification link has expired. Please request a new one.');
          throw new Error(queryParams.get('error_description') || error || 'Authentication failed');
        }

        let session = null;
        if (code) {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            session = existingSession;
          } else {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              sessionStorage.removeItem(processingKey!);
              sessionStorage.removeItem('email_verification_in_progress');
              throw new Error(`Authentication failed: ${exchangeError.message}`);
            }
            if (!data?.session) {
              sessionStorage.removeItem(processingKey!);
              sessionStorage.removeItem('email_verification_in_progress');
              throw new Error('Code exchange succeeded but no session returned');
            }
            session = data.session;
          }
        } else {
          const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !existingSession) throw new Error('No authentication code found and no active session');
          session = existingSession;
        }
        if (!isMounted || signal.aborted) return;
        await handleSuccessfulAuth(session);
      } catch (error: any) {
        if (!isMounted || signal.aborted) return;
        if (processingKey) sessionStorage.removeItem(processingKey);
        sessionStorage.removeItem('email_verification_in_progress');
        safeSetState(setStatus)('error');
        safeSetState(setErrorMessage)(error.message || 'Authentication failed');
        toast.error(error.message || 'Authentication failed');
        setTimeout(() => {
          if (!isMounted || signal.aborted) return;
          navigate('/signup', { replace: true });
        }, 3000);
      }
    };

    const handleSuccessfulAuth = async (session: any) => {
      const user = session.user;
      if (!user.email_confirmed_at) throw new Error('Email not verified. Please check your email and verify your account.');
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const phone = user.user_metadata?.phone || '';
      await authAPI.ensureProfile(user.id, user.email, name, phone);
      if (code) {
        sessionStorage.setItem(completedKey!, 'true');
        sessionStorage.removeItem(processingKey!);
      }
      sessionStorage.removeItem('email_verification_in_progress');
      safeSetState(setStatus)('success');
      toast.success('Email verified! Redirecting to onboarding...');
      setTimeout(() => {
        if (!isMounted || signal.aborted) return;
        navigate('/onboarding', { replace: true });
      }, 1500);
    };

    handleAuthCallback();
    return () => {
      isMounted = false;
      abortController?.abort();
    };
  }, []);

  if (status === 'verifying') return <LoadingScreen />;

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
